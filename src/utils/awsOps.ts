"use server";
import { db } from "@/db";
import { runningTaskTable } from "@/db/schema";
import {
  ECSClient,
  RegisterTaskDefinitionCommand,
  RegisterTaskDefinitionCommandInput,
  DeleteTaskDefinitionsCommand,
  DeleteTaskDefinitionsCommandInput,
  DeregisterTaskDefinitionCommand,
  DeregisterTaskDefinitionCommandInput,
  CreateServiceCommand,
  CreateServiceCommandInput,
  DeleteServiceCommand,
  DeleteServiceCommandInput,
  UpdateServiceCommand,
  UpdateServiceCommandInput,
  StopTaskCommand,
  StopTaskCommandInput,
  ListTasksCommand,
  ListTasksCommandInput,
  DescribeTasksCommand,
  DescribeTasksCommandInput,
} from "@aws-sdk/client-ecs";

let priority = (Math.floor(Math.random() * 40000) + 1) | 1;

import {
  ElasticLoadBalancingV2Client,
  CreateTargetGroupCommand,
  CreateTargetGroupCommandInput,
  DeleteTargetGroupCommand,
  DeleteTargetGroupCommandInput,
  CreateRuleCommand,
  CreateRuleCommandInput,
  DeleteRuleCommand,
  DeleteRuleCommandInput,
} from "@aws-sdk/client-elastic-load-balancing-v2";

import {
  Route53Client,
  ChangeResourceRecordSetsCommand,
  ChangeResourceRecordSetsCommandInput,
} from "@aws-sdk/client-route-53";
import { eq } from "drizzle-orm";

const ecs = new ECSClient({
  region: "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY!,
    secretAccessKey: process.env.AWS_SECRET!,
  },
});

const elbv2 = new ElasticLoadBalancingV2Client([
  {
    region: "ap-south-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY!,
      secret: process.env.AWS_SECRET!,
    },
  },
]);

const route53 = new Route53Client([
  {
    region: "ap-south-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY!,
      secret: process.env.AWS_SECRET!,
    },
  },
]);

async function createTaskDefinition(
  userId: string,
  projectId: string,
  template: string
) {
  const taskDefinitionParams: RegisterTaskDefinitionCommandInput = {
    family: `${projectId}-task`,
    requiresCompatibilities: ["FARGATE"],
    memory: "4 GB",
    cpu: "1 vCPU",
    networkMode: "awsvpc",
    containerDefinitions: [
      {
        name: `${projectId}-container`,
        image: process.env.IMAGE_URL!,
        portMappings: [
          {
            containerPort: 3000,
            protocol: "tcp",
            appProtocol: "http",
          },
          {
            containerPort: 5000,
            protocol: "tcp",
            appProtocol: "http",
          },
        ],
        environment: [
          {
            name: "PROJECT_ID",
            value: projectId,
          },
          {
            name: "TEMPLATE",
            value: template,
          },
          {
            name: "USER",
            value: userId,
          },
        ],
      },
    ],
    executionRoleArn: process.env.EXECUTION_ROLE_ARN!,
  };

  const command = new RegisterTaskDefinitionCommand(taskDefinitionParams);

  try {
    const data = await ecs.send(command);
    console.log(
      "Task definition created: ",
      data.taskDefinition?.taskDefinitionArn
    );
    return data.taskDefinition?.taskDefinitionArn as unknown as string;
  } catch (err) {
    console.error(err);
  }
}

async function createService(
  projectId: string,
  tg1: string,
  port1: number,
  tg2: string,
  port2: number
) {
  const createServiceParams: CreateServiceCommandInput = {
    serviceName: `${projectId}-service`,
    cluster: "test-cluster",
    taskDefinition: `${projectId}-task`,
    desiredCount: 1,

    capacityProviderStrategy: [
      {
        capacityProvider: "FARGATE",
        weight: 1,
        base: 0,
      },
    ],
    networkConfiguration: {
      awsvpcConfiguration: {
        subnets: [
          process.env.SUBNET_1!,
          process.env.SUBNET_2!,
          process.env.SUBNET_3!,
        ],
        securityGroups: [process.env.SECURITY_GROUP!],
        assignPublicIp: "ENABLED",
      },
    },
    loadBalancers: [
      {
        targetGroupArn: tg1,
        containerName: `${projectId}-container`,
        containerPort: port1,
      },
      {
        targetGroupArn: tg2,
        containerName: `${projectId}-container`,
        containerPort: port2,
      },
    ],
  };

  const createServiceCommand = new CreateServiceCommand(createServiceParams);
  try {
    const serviceData = await ecs.send(createServiceCommand);
    console.log("Service created: ", serviceData.service?.serviceArn);
    return serviceData.service?.serviceArn as unknown as string;
  } catch (err) {
    console.error(err);
  }
}

async function createTargetGroup(name: string, port: number) {
  const targetGroupParams: CreateTargetGroupCommandInput = {
    Name: name,
    Port: port,
    Protocol: "HTTP",
    VpcId: process.env.VPC_ID!,
    TargetType: "ip",
    HealthCheckPort: "5000",
  };

  const command = new CreateTargetGroupCommand(targetGroupParams);

  try {
    const data = await elbv2.send(command);
    console.log(
      "Target group created: ",
      data?.TargetGroups?.[0].TargetGroupArn
    );
    return data?.TargetGroups?.[0].TargetGroupArn as unknown as string;
  } catch (err) {
    console.error(err);
  }
}

async function createListenerRule(
  listenerArn: string,
  host: string,
  targetGroupArn: string
) {
  const listenerRuleParams: CreateRuleCommandInput = {
    Actions: [
      {
        TargetGroupArn: targetGroupArn,
        Type: "forward",
      },
    ],
    Conditions: [
      {
        Field: "host-header",
        Values: [host],
      },
    ],
    ListenerArn: listenerArn,
    Priority: priority++,
  };

  const command = new CreateRuleCommand(listenerRuleParams);

  try {
    const data = await elbv2.send(command);
    console.log("Listener rule created: ", data?.Rules?.[0].RuleArn);
    return data?.Rules?.[0].RuleArn;
  } catch (err) {
    console.error(err);
    return null;
  }
}

async function updateDnsRecord(
  subdomain: string,
  dnsName: string,
  action: "UPSERT" | "DELETE"
) {
  const changeResourceRecordSetsParams: ChangeResourceRecordSetsCommandInput = {
    ChangeBatch: {
      Changes: [
        {
          Action: action,
          ResourceRecordSet: {
            Name: subdomain,
            Type: "CNAME",
            TTL: 300,
            ResourceRecords: [
              {
                Value: dnsName,
              },
            ],
          },
        },
      ],
      Comment: "Update DNS record for subdomain",
    },
    HostedZoneId: process.env.HOSTED_ZONE_ID!,
  };

  const command = new ChangeResourceRecordSetsCommand(
    changeResourceRecordSetsParams
  );

  try {
    const data = await route53.send(command);
    console.log("DNS record updated: ", data.ChangeInfo?.Id);
    return data.ChangeInfo?.Id;
  } catch (err) {
    console.error(err);
    return null;
  }
}

async function setupRouting(
  projectid: string,
  userId: string,
  template: string
) {
  // // Create target groups for each service
  const targetGroup1Arn = await createTargetGroup("target-group-1", 5000);
  const targetGroup2Arn = await createTargetGroup("target-group-2", 3000);
  if (!targetGroup1Arn || !targetGroup2Arn) {
    return;
  }

  // Create ALB listener and specify the port
  const listenerArn = process.env.LISTENER_ARN!; // Specify your ALB listener ARN
  const subdomain1 = `${projectid}-back.invok3r.xyz`;
  const subdomain2 = `${projectid}.invok3r.xyz`;

  // Create listener rules to route requests based on subdomains
  const listenerRuleArn1 = await createListenerRule(
    listenerArn,
    subdomain1,
    targetGroup1Arn
  );
  const listenerRuleArn2 = await createListenerRule(
    listenerArn,
    subdomain2,
    targetGroup2Arn
  );

  // Update Route 53 DNS records to point to the ALB
  const dnsId1 = await updateDnsRecord(
    subdomain1,
    process.env.LB_DOMAIN!,
    "UPSERT"
  );
  const dnsId2 = await updateDnsRecord(
    subdomain2,
    process.env.LB_DOMAIN!,
    "UPSERT"
  );
  const taskArn = await createTaskDefinition(userId, projectid, template);

  const serviceArn = await createService(
    projectid,
    targetGroup1Arn,
    5000,
    targetGroup2Arn,
    3000
  );

  return {
    serviceArn,
    taskArn,
    targetGroup1Arn,
    targetGroup2Arn,
    listenerRuleArn1,
    listenerRuleArn2,
    dnsId1,
    dnsId2,
  };
}

export async function createVM(
  projectId: string,
  userId: string,
  template: string
) {
  const dataExists = await db
    .select()
    .from(runningTaskTable)
    .where(eq(runningTaskTable.projectId, projectId));

  if (dataExists.length > 0) {
    await deleteVM(projectId);
  }

  if (!projectId || !userId || !template) {
    return false;
  }

  const arns = await setupRouting(projectId, userId, template);

  if (arns) {
    const x = await db.insert(runningTaskTable).values({
      listenerRuleArn1: arns.listenerRuleArn1,
      listenerRuleArn2: arns.listenerRuleArn2,
      projectId,
      serviceArn: arns.serviceArn,
      taskArn: arns.taskArn,
      targetGroup1Arn: arns.targetGroup1Arn,
      targetGroup2Arn: arns.targetGroup2Arn,
    });

    console.log({ arns });

    return true;
  }
  return false;
}

export async function deleteVM(projectId: string) {
  const data = await db
    .select()
    .from(runningTaskTable)
    .where(eq(runningTaskTable.projectId, projectId));

  if (data.length === 0) {
    return;
  }

  const serviceArn = data[0].serviceArn;
  const taskArn = data[0].taskArn as string;
  const targetGroup1Arn = data[0].targetGroup1Arn as string;
  const targetGroup2Arn = data[0].targetGroup2Arn as string;
  const listenerRuleArn1 = data[0].listenerRuleArn1 as string;
  const listenerRuleArn2 = data[0].listenerRuleArn2 as string;

  const updateServiceParams: UpdateServiceCommandInput = {
    service: `${projectId}-service`,
    cluster: "test-cluster",
    desiredCount: 0,
  };

  const updateServiceCommand = new UpdateServiceCommand(updateServiceParams);

  try {
    const data = await ecs.send(updateServiceCommand);
    console.log("Service updated: ", data);
  } catch (err) {
    console.error(err);
  }

  const deleteServiceParams: DeleteServiceCommandInput = {
    service: `${projectId}-service`,
    cluster: "test-cluster",
    force: true,
  };

  const deleteServiceCommand = new DeleteServiceCommand(deleteServiceParams);

  try {
    const data = await ecs.send(deleteServiceCommand);
    console.log("Service deleted: ", data);
  } catch (err) {
    console.error(err);
  }

  const listTasksParams: ListTasksCommandInput = {
    cluster: "test-cluster",
  };

  const listTasksCommand = new ListTasksCommand(listTasksParams);

  try {
    const data = await ecs.send(listTasksCommand);
    console.log("Tasks list: ", data.taskArns);

    if (data.taskArns?.length) {
      const describeTasksParams: DescribeTasksCommandInput = {
        cluster: "test-cluster",
        tasks: data.taskArns,
      };

      const describeTasksCommand = new DescribeTasksCommand(
        describeTasksParams
      );

      const data2 = await ecs.send(describeTasksCommand);
      console.log("Task details: ", data2.tasks?.length);
      const filteredTasks = data2.tasks
        ?.filter((task) => task.group === `service:${projectId}-service`)
        .map((task) => task.taskArn);

      console.log("Filtered tasks: ", filteredTasks);

      await Promise.all(
        filteredTasks?.map(async (task) => {
          const stopTaskParams: StopTaskCommandInput = {
            task: task,
            cluster: "test-cluster",
          };

          const stopTaskCommand = new StopTaskCommand(stopTaskParams);

          try {
            const data = await ecs.send(stopTaskCommand);
            console.log("Task stopped: ", data.task?.taskArn);
          } catch (err) {
            console.error(err);
          }
        }) ?? []
      );
    }
  } catch (err) {
    console.error(err);
  }

  const deleteTaskDefinitionParams: DeleteTaskDefinitionsCommandInput = {
    taskDefinitions: [taskArn],
  };

  const deregisterTaskDefinitionParams: DeregisterTaskDefinitionCommandInput = {
    taskDefinition: taskArn,
  };

  const deregisterTaskDefinitionCommand = new DeregisterTaskDefinitionCommand(
    deregisterTaskDefinitionParams
  );

  try {
    const data = await ecs.send(deregisterTaskDefinitionCommand);
    console.log("Task definition deregistered: ", data);
  } catch (err) {
    console.error(err);
  }

  const deleteTaskDefinitionCommand = new DeleteTaskDefinitionsCommand(
    deleteTaskDefinitionParams
  );

  try {
    const data = await ecs.send(deleteTaskDefinitionCommand);
    console.log("Task definition deleted: ", data);
  } catch (err) {
    console.error(err);
  }

  const deleteRuleParams: DeleteRuleCommandInput = {
    RuleArn: listenerRuleArn1,
  };

  const deleteRuleCommand = new DeleteRuleCommand(deleteRuleParams);

  try {
    const data = await elbv2.send(deleteRuleCommand);
    console.log("Listener rule deleted: ", data);
  } catch (err) {
    console.error(err);
  }

  const deleteRuleParams2: DeleteRuleCommandInput = {
    RuleArn: listenerRuleArn2,
  };

  const deleteRuleCommand2 = new DeleteRuleCommand(deleteRuleParams2);

  try {
    const data = await elbv2.send(deleteRuleCommand2);
    console.log("Listener   rule deleted: ", data);
  } catch (err) {
    console.error(err);
  }

  const deleteTargetGroupParams: DeleteTargetGroupCommandInput = {
    TargetGroupArn: targetGroup1Arn,
  };

  const deleteTargetGroupParams2: DeleteTargetGroupCommandInput = {
    TargetGroupArn: targetGroup2Arn,
  };

  const deleteTargetGroupCommand = new DeleteTargetGroupCommand(
    deleteTargetGroupParams
  );

  const deleteTargetGroupCommand2 = new DeleteTargetGroupCommand(
    deleteTargetGroupParams2
  );

  try {
    const data = await elbv2.send(deleteTargetGroupCommand);
    console.log("Target group deleted: ", data);
    const data2 = await elbv2.send(deleteTargetGroupCommand2);
    console.log("Target group deleted: ", data2);
  } catch (err) {
    console.error(err);
  }

  const dnsId1 = await updateDnsRecord(
    `${projectId}-back.invok3r.xyz`,
    process.env.LB_DOMAIN!,
    "DELETE"
  );
  const dnsId2 = await updateDnsRecord(
    `${projectId}.invok3r.xyz`,
    process.env.LB_DOMAIN!,
    "DELETE"
  );

  console.log({ dnsId1, dnsId2 });

  await db
    .delete(runningTaskTable)
    .where(eq(runningTaskTable.projectId, projectId));
}
