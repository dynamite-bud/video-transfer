import React, { useState, useRef, useCallback, useLayoutEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Base64 } from "js-base64";

import {
  base64DecToArr,
  base64EncArr,
  UTF8ArrToStr,
  strToUTF8Arr,
} from "./utils/base64";

const videoWorker = new Worker(
  new URL("./workers/videoWorker.ts", import.meta.url),
  {
    type: "module",
  }
);

let currentTransport, streamNumber, currentTransportDatagramWriter;

async function readStream<T>(
  stream: ReadableStream<T>,
  cb: (data: T) => Promise<void> | void
) {
  const reader = stream.getReader();
  for (
    let result = await reader.read();
    !result.done;
    result = await reader.read()
  ) {
    await cb(result.value);
  }
}

interface VideoProps {
  preview: boolean;
  file: File | null;
}

function App() {
  const transport = useRef<any>(null);

  const [userVideo, setUserVideo] = useState<VideoProps>({
    preview: false,
    file: null,
  });
  const userVideoRef = useRef<HTMLVideoElement>(null);
  const videoCanvasRef = useRef<HTMLCanvasElement>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // if (userVideo?.preview) {
    //   console.log("revoked");
    // URL.revokeObjectURL(userVideo.preview);
    // }
    const file = acceptedFiles[0];
    setUserVideo({
      // preview: URL.createObjectURL(file),
      preview: true,
      file,
    });
  }, []);

  useLayoutEffect(() => {
    // "Connect" button handler.
    async function connect() {
      const url = "https://localhost:4433/counter";
      try {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        transport.current = new WebTransport(url);
        console.log("Initiating connection...");
      } catch (e) {
        console.log("Failed to create connection object. " + e, "error");
        return;
      }

      try {
        await transport.current.ready;
        console.log("Connection ready.");
      } catch (e) {
        console.log("Connection failed. " + e, "error");
        return;
      }

      transport.current.closed
        .then(() => {
          console.log("Connection closed normally.");
        })
        .catch(() => {
          console.log("Connection closed abruptly.", "error");
        });

      currentTransport = transport.current;
      streamNumber = 1;
      try {
        console.log(currentTransport.datagrams.writable.getWriter());
        // currentTransportDatagramWriter =
        // transport.current.datagrams.writable.getWriter();
        console.log("Datagram writer ready.");
      } catch (e) {
        console.log("Sending datagrams not supported: " + e, "error");
        return;
      }
      // readDatagrams(transport);
      // acceptUnidirectionalStreams(transport);
      // document.forms.sending.elements.send.disabled = false;
      // document.getElementById("connect").disabled = true;
    }
    // connect();
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    maxFiles: 1,
    accept: {
      "video/*": [],
    },
    onDrop,
  });

  const loadVideo = useCallback(
    async (src: ReturnType<typeof URL.createObjectURL>) => {
      if (!src || !userVideoRef.current) return;

      const video = userVideoRef.current;
      let playing = false;
      let timeupdate = false;

      video.autoplay = true;
      video.muted = true;
      video.loop = false;
      video.src = src;
      // video.play();

      const checkStatus = () => playing && timeupdate;

      return new Promise<HTMLVideoElement>((res, rej) => {
        video.addEventListener(
          "playing",
          () => {
            playing = true;
            if (checkStatus()) {
              res(video);
            }
          },
          true
        );

        video.addEventListener(
          "timeupdate",
          () => {
            timeupdate = true;
            if (checkStatus()) {
              res(video);
            }
          },
          true
        );
      });
    },
    []
  );

  const webcodes = async (file: File) => {
    // === use video to get frame === start ===
    const video = await loadVideo(URL.createObjectURL(file));
    if (!video || !videoCanvasRef.current) return;

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    const videoStream = video.captureStream();
    const videoTrack = videoStream.getVideoTracks()[0] as {
      track: MediaStreamVideoTrack;
    };

    // video.pause();

    video.currentTime = 0;
    const streamableVideo = new MediaStreamTrackProcessor(videoTrack).readable;

    // let frameCount = 0;

    video.play();

    videoCanvasRef.current.width = video.videoWidth;
    videoCanvasRef.current.height = video.videoHeight;

    console.log(video.videoWidth, video.videoHeight);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const offScreenCanvas = videoCanvasRef.current.transferControlToOffscreen();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    videoWorker.postMessage(
      {
        type: "process-video",
        payload: {
          videoStream: streamableVideo,
          offScreenCanvas,
        },
      },
      // [streamableVideo]
      [streamableVideo, offScreenCanvas]
    );

    // const vid2DContext = videoCanvasRef.current.getContext("bitmaprenderer");

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    // const offscreen = new OffscreenCanvas(video.videoWidth, video.videoHeight);
    // const bmp = offscreen.getContext("bitmaprenderer");

    // await readStream<VideoFrame>(streamableVideo, async (frame) => {
    // const bitmap = await createImageBitmap(frame);
    // vid2DContext?.transferFromImageBitmap(bitmap);

    // vid2DContext!.drawImage(frame, 0, 0);
    // console.log(videoCanvasRef.current!.toDataURL());
    // console.log(frame.allocationSize());
    // const frameData = new Uint8Array(frame.allocationSize());
    // console.log(frameData);
    // frame.copyTo(frameData);
    // console.log(frameData);
    // console.log(Base64.fromUint8Array(frameData) === base64EncArr(frameData));
    // console.log(base64String);
    // const bitmap = await createImageBitmap(frame);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    // bmp.transferFromImageBitmap(bitmap);
    // const blb = await offscreen.convertToBlob({ type: "image/jpeg" });
    // const blb = await offscreen.convertToBlob();
    // console.log(blb);
    // setImgBitmap(bitmap);
    // Base64.fromUint8Array();
    // console.log(bitmap);
    // console.log(frame.timestamp, frame.duration);
    // frameCount++;
    // console.log(frameCount);
    // frame.close();
    // });
  };

  const vidFrameCb = useCallback(async (file: File) => {
    const video = await loadVideo(URL.createObjectURL(file));
    if (!video || !videoCanvasRef.current) return;

    const vidCanvas = videoCanvasRef.current;
    const vidContext = vidCanvas.getContext("2d");

    vidCanvas.width = video.videoWidth;
    vidCanvas.height = video.videoHeight;

    const base64Frames: Array<string> = [];
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    const playFrame = (now, metadata) => {
      console.log(now, metadata);
      video.pause();
      vidContext?.drawImage(video, 0, 0);
      base64Frames.push(vidCanvas.toDataURL());
      video.play();
      video.requestVideoFrameCallback(playFrame);
    };

    video.onended = () => {
      console.log(base64Frames);
    };

    console.log(video.requestVideoFrameCallback);

    video.requestVideoFrameCallback(playFrame);
  }, []);

  const handleUpload = async () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    const videoStream = userVideoRef.current.captureStream();
    const videoTrack = videoStream.getVideoTracks()[0];
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    const trackProcessor = new MediaStreamTrackProcessor(videoTrack);

    // const frames = [];
    // let frameCounter = 0;
    const reader = trackProcessor.readable.getReader();
    console.log(videoStream, videoTrack, trackProcessor);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    const imageCapture = new ImageCapture(videoTrack);
    console.log(imageCapture.track);

    const photoSettings = {
      imageWidth: 640,
      imageHeight: 480,
    };
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    imageCapture.takePhoto(photoSettings).then((blob) => console.log(blob));

    // let frameNum = 0;
    // while (frameNum < 5) {
    //   // const { done, value } = await reader.read();
    //   // if (done) return;
    //   const imageBlob = await imageCapture.takePhoto();
    //   console.log(imageBlob);
    //   frameNum++;

    // }

    // userVideoRef.current?.play();
  };

  return (
    <section className=" bg-gray-50">
      <div {...getRootProps({ className: "" })}>
        <input {...getInputProps()} />
        <p>{`Drag 'n' drop some files here, or click to select files`}</p>
        <em>(2 files are the maximum number of files you can drop here)</em>
      </div>
      <aside>
        <h4>Accepted files</h4>
        {/* <ul>{acceptedFileItems}</ul> */}
        <h4>Rejected files</h4>
        {/* <ul>{fileRejectionItems}</ul> */}
      </aside>
      {userVideo?.preview && userVideo?.file && (
        <>
          <video ref={userVideoRef} width={1920} controls />
          <canvas ref={videoCanvasRef} width={1920} />

          <button
            className="p-2 my-2 text-white bg-black rounded-md"
            onClick={() => webcodes(userVideo.file!)}
            // onClick={() => vidFrameCb(userVideo.file!)}
          >
            Submit
          </button>
        </>
      )}
    </section>
  );
}

export default App;
