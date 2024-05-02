import React, { useEffect, useRef, useState } from "react";
import { RotateCcw, SquareArrowOutUpRight, ArrowRight } from "lucide-react";

let timer: NodeJS.Timeout;

export default function PreviewWindow({
  frontendUrl,
}: {
  frontendUrl: string;
}) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [url, setUrl] = useState<string>(frontendUrl);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const handleReload = () => {
    iframeRef.current?.contentWindow?.location.replace(url);
  };

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(frontendUrl);
        if (res.status !== 200) {
          setTimeout(() => {
            checkStatus();
          }, 2000);
        } else {
          handleReload();
        }
      } catch (e) {
        console.log("error fetching", e);
        setTimeout(() => {
          checkStatus();
        }, 3000);
      }
    };
    if (isLoading) {
      checkStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  return (
    <div className="relative w-full h-full bg-transparent">
      <div className="flex gap-2 items-center px-10 py-1 border border-neutral-600">
        <button className="p-1  bg-neutral-700 rounded-md hover:bg-neutral-900">
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            title="Open in new tab"
          >
            <SquareArrowOutUpRight size={16} />
          </a>
        </button>
        <button
          className="p-1  bg-neutral-700 rounded-md hover:bg-neutral-900"
          onClick={handleReload}
          aria-label="Reload Iframe"
          title="Reload"
        >
          <RotateCcw size={16} />
        </button>
        <input
          type="text"
          className="w-full bg-neutral-700 h-5 px-2 py-1 text-sm focus:outline-none "
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button
          className="p-1  bg-neutral-700 rounded-md hover:bg-neutral-900"
          onClick={() =>
            iframeRef.current?.contentWindow?.location.replace(url)
          }
          title="Go to URL"
        >
          <ArrowRight size={16} />
        </button>
      </div>
      <iframe
        ref={iframeRef}
        src={frontendUrl}
        className=" h-full w-full block absolute p-3"
        sandbox="allow-forms allow-modals allow-popups allow-presentation allow-scripts allow-downloads allow-pointer-lock"
        allow="geolocation"
        srcDoc="<!DOCTYPE html><html><head><title>Preview</title></head><body>Waiting for Server</body></html>"
      />
    </div>
  );
}
