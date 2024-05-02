"use client";
import { Editor } from "@monaco-editor/react";
import React, { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { FileRepresentation } from "./Files";
import { useRouter } from "next/navigation";
import { ITerminalOptions, Terminal } from "@xterm/xterm";
import SplitPane, { Pane } from "split-pane-react";
import "./styles.css";

import "@xterm/xterm/css/xterm.css";
import PreviewWindow from "./PreviewWindow";
import { X } from "lucide-react";

import { languageMapping, xtermjsTheme } from "@/constants/index";
import { setTime } from "@/actions/setTime";

let socket: Socket;
let term: Terminal;
let timer: NodeJS.Timeout;

export default function ProjectPage({
  params: { project },
}: {
  params: { project: string };
}) {
  const [openFolders, setOpenFolders] = useState<string[]>([]);
  const frontendUrl = `https://${project}.invok3r.xyz`;
  const backendUrl = `https://${project}-back.invok3r.xyz`;
  const [files, setFiles] = useState<any>([]);
  const [modal, setModal] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [selectedFileContent, setSelectedFileContent] = useState<string>("");
  const [verticalSizes, setVerticalSizes] = useState([70, 30]);
  const [sizes, setSizes] = useState([20, 40, 40]);
  const [selectedFilesWithContent, setSelectedFilesWithContent] = useState<any>(
    {}
  );
  const [allocating, setAllocating] = useState<boolean>(true);

  const router = useRouter();
  const terminalRef = useRef<any>();

  useEffect(() => {
    window.onbeforeunload = async () => {
      if (socket) {
        socket.disconnect();
      }
      await setTime(project);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  //check server for status every 3 seconds

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(backendUrl);
        if (res.status !== 200) {
          setTimeout(() => {
            checkStatus();
          }, 3000);
        } else {
          setAllocating(false);
        }
      } catch (e) {
        console.log("error fetching", e);
        setTimeout(() => {
          checkStatus();
        }, 3000);
      }
    };
    checkStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (term && terminalRef.current) {
        const termHeight = terminalRef.current?.getBoundingClientRect().height;
        const termWidth = terminalRef.current?.getBoundingClientRect().width;
        const cols = Math.floor(termWidth / 9);
        const rows = Math.floor(termHeight / 17);
        term?.resize(cols, rows);
        socket.emit("resize", { cols, rows });
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);
  useEffect(() => {
    if (!allocating) {
      socket = io(backendUrl, {
        transports: ["websocket"],
      });

      socket.on("connect", () => {
        socket.emit("info", "Connected to backend");
      });

      socket.on("files", (data) => {
        setFiles(data);
        if (openFolders.length === 0) {
          setOpenFolders([data[0].path]);
        }
      });

      term = new Terminal({
        allowProposedApi: true,
        fontFamily:
          '"Fira Code", courier-new, courier, monospace, "Powerline Extra Symbols"',
        theme: xtermjsTheme,
        scrollOnUserInput: true,
      } as ITerminalOptions);
      term.resize(40, 30);

      term.open(terminalRef.current);

      socket.on("terminal", (data) => {
        term.write(data);
      });

      term.onData((data) => {
        socket.emit("terminal", data);
      });

      socket.on("secondconnection", (data) => {
        socket.disconnect();
        setModal(true);
      });

      socket.on("disconnect", () => {
        console.log("Disconnected from backend");
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, allocating]);

  useEffect(() => {
    if (socket) {
      if (selectedFile) {
        socket?.emit("file-content", selectedFile);
      } else {
        setSelectedFile(Object.keys(selectedFilesWithContent)[0]);
      }

      socket?.on("file-content", (data) => {
        setSelectedFileContent(data);
        setSelectedFilesWithContent((prev: any) => {
          prev[`${selectedFile}`] = data;
          return prev;
        });
      });
    }
    return () => {
      socket?.off("file-content");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFile]);

  if (modal) {
    return (
      <div className="w-screen min-h-screen flex items-center justify-center">
        <div className="flex items-center justify-center flex-col gap-5 border rounded-md p-10">
          <h1 className="text-3xl"> Second connection detected</h1>
          <h2>Do you want to keep using here?</h2>
          <div className="flex gap-20">
            <button
              className="bg-blue-500 text-white px-5 py-2 rounded-md"
              onClick={() => {
                window.location.reload();
              }}
            >
              Yes
            </button>
            <button
              className="bg-red-500 text-white px-5 py-2 rounded-md"
              onClick={() => {
                router.push("/");
              }}
            >
              No
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (allocating) {
    return (
      <div className="w-screen h-screen flex items-center justify-center">
        <h1 className="text-3xl flex gap-5 items-center">
          <div className="min-h-10 min-w-10 animate-spin border-4 rounded-full border-black border-t-white"></div>
          <span>Allocating resources...</span>
        </h1>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-neutral-800 max-h-screen">
      <SplitPane className="flex gap-20" sizes={sizes} onChange={setSizes}>
        <Pane className="p-1 w-full h-full">
          <>
            {files.length > 0 && (
              <div className="flex h-full w-full overflow-auto bg-neutral-900/40 p-2">
                <ul className="w-full h-full">
                  <FileRepresentation
                    file={files[0]}
                    setSelectedFile={setSelectedFile}
                    selectedFile={selectedFile}
                    openFolders={openFolders}
                    setOpenFolders={setOpenFolders}
                    socket={socket}
                  />
                </ul>
              </div>
            )}
          </>
        </Pane>
        <Pane className="p-1">
          <div className="w-full h-screen">
            <SplitPane
              className="flex gap-20"
              split="horizontal"
              sizes={verticalSizes}
              onChange={setVerticalSizes}
            >
              <Pane>
                <div className="w-full h-full">
                  <div>
                    {selectedFilesWithContent && (
                      <div className="flex items-center gap-2 overflow-x-auto">
                        {Object.keys(selectedFilesWithContent).map(
                          (file, index) => (
                            <div
                              className="w-fit h-8 flex items-center text-sm bg-neutral-900/40 hover:bg-neutral-900/50 cursor-pointer p-2 border-b border-neutral-900/20"
                              key={index}
                              style={{
                                backgroundColor:
                                  selectedFile === file ? "#1e1e1e" : "#2e2e2e",
                                borderTop:
                                  selectedFile === file ? "1px solid #555" : "",
                                borderLeft:
                                  selectedFile === file ? "1px solid #555" : "",
                                borderRight:
                                  selectedFile === file ? "1px solid #555" : "",
                              }}
                            >
                              <button
                                onClick={() => {
                                  setSelectedFile(file);
                                  setSelectedFileContent(
                                    selectedFilesWithContent[file]
                                  );
                                }}
                                className="pr-4 w-full"
                              >
                                {file.split("/").pop()}
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedFilesWithContent((prev: any) => {
                                    delete prev[file];
                                    if (
                                      selectedFile === file ||
                                      Object.keys(prev).length !== 1
                                    ) {
                                      setSelectedFile(Object.keys(prev)[0]);
                                    } else {
                                      setSelectedFile("");
                                    }
                                    return prev;
                                  });
                                }}
                              >
                                <X size={16} />
                              </button>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                  {selectedFile && (
                    <Editor
                      height="100%"
                      width="100%"
                      theme="vs-dark"
                      value={selectedFileContent}
                      language={
                        languageMapping[
                          selectedFile
                            .split(".")
                            .pop() as keyof typeof languageMapping
                        ] || "plaintext"
                      }
                      onChange={(e) => {
                        const handleFileSave = () => {
                          clearTimeout(timer);
                          timer = setTimeout(() => {
                            socket?.emit(
                              "file-save",
                              JSON.stringify({ file: selectedFile, content: e })
                            );
                          }, 500);
                        };
                        handleFileSave();
                      }}
                    />
                  )}
                </div>
              </Pane>
              <Pane>
                <div className="w-full h-full" ref={terminalRef}>
                  {" "}
                </div>
              </Pane>
            </SplitPane>
          </div>
        </Pane>

        <Pane minSize={"50px"} className="p-2">
          {frontendUrl && <PreviewWindow frontendUrl={frontendUrl} />}
        </Pane>
      </SplitPane>
    </div>
  );
}
