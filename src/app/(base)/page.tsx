"use client";

import { handleFormSubmit } from "@/actions";
import { useState } from "react";

export default function Home() {
  const [showModal, setShowModal] = useState<string | null>(null);
  // const [loading, setLoading] = useState<boolean>(false);
  // const [state, formAction, isPending] = useActionState(handleFormSubmit, null);

  // if (isPending) {
  //   return (
  //     <div className="w-screen h-screen flex items-center justify-center">
  //       <h1 className="text-3xl flex gap-5 items-center">
  //         <div className="h-10 w-10 animate-spin border-4 rounded-full border-black border-t-white"></div>
  //         <div>Allocating resources...</div>
  //       </h1>
  //     </div>
  //   );
  // }

  if (showModal) {
    return (
      <div className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-10 p-8 border rounded-md bg-neutral-700/60">
          <h1 className="text-2xl">Create a Project using {showModal}.js</h1>
          <form
            className="flex flex-col  items-center gap-5 w-full"
            action={handleFormSubmit}
          >
            <input type="hidden" name="template" value={showModal} />
            <input
              className="text-black w-full p-2 focus:outline-none"
              type="text"
              placeholder="Project Name"
              name="project"
            />
            <div className="flex gap-5">
              <button className="rounded-md bg-blue-500 p-4" type="submit">
                Create
              </button>
              <button
                className="bg-red-500 p-4 rounded-md"
                onClick={() => {
                  setShowModal(null);
                }}
                type="button"
              >
                Close
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center justify-center py-8 px-12 rounded-md gap-10 border">
        <h1 className="text-4xl">Create a Project</h1>
        <div>Choose Your Project Skeleton</div>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => {
              setShowModal("next");
            }}
            className="bg-neutral-700 p-4 rounded-md "
          >
            Next.js
          </button>
          <button
            onClick={() => {
              setShowModal("react");
            }}
            className="bg-neutral-700 p-4 rounded-md"
          >
            React
          </button>
        </div>

        {/* <form action={handleFormSu bmit}>
        <input
        className="text-black"
        type="text"
        placeholder="Project Name"
        name="project"
        />
        <button>Create</button>
      </form> */}
      </div>
    </div>
  );
}
