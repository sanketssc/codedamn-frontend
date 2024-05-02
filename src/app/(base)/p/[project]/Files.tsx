"use client";
import { Editor } from "@monaco-editor/react";
import { ChevronDown, ChevronRight, File, Folder } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";

type Files = {
  path: string;
  type: "folder" | "file";
  name: string;
  isOpen?: boolean;
  files?: Files[];
};

export const FileRepresentation = ({
  file,
  setSelectedFile,
  selectedFile,
  openFolders,
  setOpenFolders,
  socket,
  level = 0,
}: {
  file: Files;
  setSelectedFile: React.Dispatch<React.SetStateAction<string>>;
  selectedFile: string;
  openFolders: string[];
  setOpenFolders: React.Dispatch<React.SetStateAction<string[]>>;
  socket: Socket;
  level?: number;
}) => {
  const [contextMenu, setContextMenu] = useState({ x: 0, y: 0, show: false });
  const [renameFile, setRenameFile] = useState(false);

  const divRef = useRef<HTMLDivElement>(null);

  const contentEditableRef = useRef<HTMLParagraphElement>(null);

  const handleFocus = () => {
    const selection = window.getSelection();
    if (!selection) return;
    if (!contentEditableRef?.current) return;
    const range = document.createRange();
    const divNode = contentEditableRef.current;
    if (!divNode) return;
    if (!divNode.firstChild) return;
    if (!divNode.textContent) return;

    const textArr = divNode.textContent.split(".");
    textArr.pop();
    const textWithoutExtension = textArr.join(".");

    range.setStart(divNode.firstChild, 0);
    range.setEnd(divNode.firstChild, textWithoutExtension?.length);

    selection.removeAllRanges();
    selection.addRange(range);
  };

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!contextMenu.show) return;
      if (divRef.current?.contains(event.target as Node)) return;
      setContextMenu({ x: 0, y: 0, show: false });
    };

    document.addEventListener("click", handleClick);
    document.addEventListener("contextmenu", handleClick);

    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("contextmenu", handleClick);
    };
  }, [contextMenu]);

  const getName = () => {
    return prompt("Enter Name");
  };

  const createFile = () => {
    if (!file.files) return;
    setContextMenu({ x: 0, y: 0, show: false });
    const name = getName();

    if (!name) return;

    const exists = file.files.find((f: any) => f.name === name);
    if (exists) {
      alert("File already exists");
      return;
    }

    socket.emit("create-file", {
      path: `${file.path}/${name}`,
      type: "file",
    });
  };

  const handleRenameFile = () => {
    setContextMenu({ x: 0, y: 0, show: false });
    setRenameFile(true);
    const elem = document.getElementById(file.path);
    setTimeout(() => {
      elem?.focus();
    }, 0);
  };

  const createFolder = () => {
    if (!file.files) return;
    setContextMenu({ x: 0, y: 0, show: false });
    const name = getName();

    if (!name) return;

    const exists = file.files.find((f: any) => f.name === name);
    if (exists) {
      alert("Folder already exists");
      return;
    }

    socket.emit("create-file", {
      path: `${file.path}/${name}`,
      type: "folder",
    });
  };

  const deleteFile = () => {
    setContextMenu({ x: 0, y: 0, show: false });
    socket.emit("delete-file", { path: file.path, type: file.type });
  };

  return (
    <li className={"text-sm selection:bg-black "}>
      {contextMenu.show && (
        <div
          ref={divRef}
          className="absolute bg-neutral-800 border w-48 text-left border-neutral-500 flex flex-col gap-1 shadow-lg z-10"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          {file.type === "folder" && (
            <button
              onClick={createFile}
              className="hover:bg-neutral-600/50 text-left border-t-neutral-500/50 border-t px-2"
            >
              New File
            </button>
          )}
          {file.type === "folder" && (
            <button
              onClick={createFolder}
              className="hover:bg-neutral-600/50 text-left border-t-neutral-500/50 border-t px-2"
            >
              New Folder
            </button>
          )}
          <button
            onClick={handleRenameFile}
            className="hover:bg-neutral-600/50 text-left border-t-neutral-500/50 border-t px-2"
          >
            Rename
          </button>
          <button
            onClick={deleteFile}
            className="hover:bg-neutral-600/50 text-left border-t-neutral-500/50 border-t px-2"
          >
            Delete
          </button>
        </div>
      )}
      {file.type === "folder" ? (
        <span
          onClick={() => {
            const isOpen = openFolders.includes(file.path);
            if (isOpen) {
              setOpenFolders((prev) => prev.filter((f) => f !== file.path));
            } else {
              setOpenFolders([...openFolders, file.path]);
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setContextMenu({ x: e.clientX, y: e.clientY, show: true });
          }}
          style={{ paddingLeft: `${level * 20 - 4}px` }}
          className="w-full cursor-pointer flex items-center rounded-sm hover:bg-neutral-950/15 border px-2 border-transparent hover:border-neutral-600"
        >
          {openFolders.includes(file.path) ? (
            <ChevronDown size={18} />
          ) : (
            <ChevronRight size={18} />
          )}
          {<Folder size={18} />}&nbsp;{" "}
          {renameFile ? (
            <p
              id={file.path}
              contentEditable={renameFile}
              ref={contentEditableRef}
              suppressContentEditableWarning
              className="focus:outline-none focus:bg-neutral-900 focus:text-white cursor-text selection:bg-neutral-400"
              onBlur={(e) => {
                setRenameFile(false);
              }}
              onFocus={handleFocus}
            >
              {file.name}
            </p>
          ) : (
            <p id={file.path}>{file.name}</p>
          )}
        </span>
      ) : (
        <span
          onClick={() => setSelectedFile(file.path)}
          style={{ paddingLeft: `${level * 20}px` }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setContextMenu({ x: e.clientX, y: e.clientY, show: true });
          }}
          className={`w-full hover:bg-neutral-950/15 rounded-sm cursor-pointer flex items-center px-2 border border-transparent hover:border-neutral-600  ${
            selectedFile === file.path
              ? "bg-neutral-700/30 border border-neutral-500/50"
              : "bg-transparent"
          }`}
        >
          {<File size={18} />}&nbsp;
          {renameFile ? (
            <p
              id={file.path}
              contentEditable={renameFile}
              ref={contentEditableRef}
              suppressContentEditableWarning
              className="focus:outline-none focus:bg-neutral-900 focus:text-white cursor-text selection:bg-neutral-400"
              onBlur={() => setRenameFile(false)}
              onFocus={handleFocus}
            >
              {file.name}
            </p>
          ) : (
            <p id={file.path}>{file.name}</p>
          )}
        </span>
      )}
      {file.type === "folder" &&
        openFolders.includes(file.path) &&
        file.files && (
          <ul className="">
            {file.files.map((file: any, index: any) => (
              <FileRepresentation
                key={index}
                file={file}
                setSelectedFile={setSelectedFile}
                selectedFile={selectedFile}
                setOpenFolders={setOpenFolders}
                openFolders={openFolders}
                level={level + 1}
                socket={socket}
              />
            ))}
          </ul>
        )}
    </li>
  );
};
