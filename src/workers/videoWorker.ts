export {};

import pako from "pako";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-expect-error
let currentTransport,
  streamNumber = 0;

// "Connect" button handler.
(async function connect() {
  const url = "https://localhost:4433/counter";
  let transport;
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-expect-error
    // eslint-disable-next-line no-var
    transport = new WebTransport(url);
    console.log("Initiating connection...");
  } catch (e) {
    console.log("Failed to create connection object. " + e, "error");
    return;
  }

  try {
    await transport.ready;
    console.log("Connection ready.");
  } catch (e) {
    console.log("Connection failed. " + e, "error");
    return;
  }
  transport.closed
    .then(() => {
      console.log("Connection closed normally.");
    })
    .catch(() => {
      console.log("Connection closed abruptly.", "error");
    });

  currentTransport = transport;
  streamNumber = 1;
})();

const base64FromTypedArray = async (data: Uint8Array) => {
  console.log("here");
  // Use a FileReader to generate a base64 data URI
  const base64url = await new Promise((r) => {
    const reader = new FileReader();
    reader.onload = () => r(reader.result);
    reader.readAsDataURL(new Blob([data]));
  });

  /*
  The result looks like 
  "data:application/octet-stream;base64,<your base64 data>", 
  so we split off the beginning:
  */
  return (base64url as any).split(",", 2)[1];
};

function base64ArrayBuffer(byts: Uint8Array) {
  let base64 = "";
  const encodings =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

  const bytes = byts;
  const byteLength = bytes.byteLength;
  const byteRemainder = byteLength % 3;
  const mainLength = byteLength - byteRemainder;

  let a, b, c, d;
  let chunk;

  // Main loop deals with bytes in chunks of 3
  for (let i = 0; i < mainLength; i = i + 3) {
    // Combine the three bytes into a single integer
    chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];

    // Use bitmasks to extract 6-bit segments from the triplet
    a = (chunk & 16515072) >> 18; // 16515072 = (2^6 - 1) << 18
    b = (chunk & 258048) >> 12; // 258048   = (2^6 - 1) << 12
    c = (chunk & 4032) >> 6; // 4032     = (2^6 - 1) << 6
    d = chunk & 63; // 63       = 2^6 - 1

    // Convert the raw binary segments to the appropriate ASCII encoding
    base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d];
  }

  // Deal with the remaining bytes and padding
  if (byteRemainder == 1) {
    chunk = bytes[mainLength];

    a = (chunk & 252) >> 2; // 252 = (2^6 - 1) << 2

    // Set the 4 least significant bits to zero
    b = (chunk & 3) << 4; // 3   = 2^2 - 1

    base64 += encodings[a] + encodings[b] + "==";
  } else if (byteRemainder == 2) {
    chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1];

    a = (chunk & 64512) >> 10; // 64512 = (2^6 - 1) << 10
    b = (chunk & 1008) >> 4; // 1008  = (2^6 - 1) << 4

    // Set the 2 least significant bits to zero
    c = (chunk & 15) << 2; // 15    = 2^4 - 1

    base64 += encodings[a] + encodings[b] + encodings[c] + "=";
  }

  return base64;
}

interface workerMessageProps {
  type: string;
  payload?: {
    videoStream: ReadableStream<VideoFrame>;
    offScreenCanvas: OffscreenCanvas;
  };
}

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

self.onmessage = async (e) => {
  if (!e.data) return;
  const { type, payload } = e.data as workerMessageProps;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  const transport = currentTransport;
  if (type === "process-video") {
    console.log("process-video");
    let frameCount = 0;
    const { videoStream, offScreenCanvas } = payload!;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    const ctx = offScreenCanvas.getContext("2d");
    // const ctx = offScreenCanvas.getContext("webgl2");
    // const ctx = offScreenCanvas.getContext("bitmaprenderer");

    const videoFrames: Array<any> = [];

    await readStream(videoStream, async (frame) => {
      ctx.drawImage(frame, 0, 0);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      videoFrames.push(
        ctx.getImageData(0, 0, frame.codedWidth, frame.codedHeight)
      );

      frameCount++;
      console.log(frameCount);
      frame.close();

      // const frameData = new Uint8ClampedArray(frame.allocationSize());
      // const frameBuffer = new Uint8ClampedArray(frame.allocationSize());
      // await frame.copyTo(frameBuffer).then((layout) => {
      //   videoFrames.push({
      //     frameBuffer,
      //     layout,
      //   });
      // });
      // const base64Data = btoa(
      //   String.fromCharCode.apply(null, frameData as any)
      // );
      // console.log(base64Data);
      // cnv2Drenderer.drawImage(frame, 0, 0);

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      // const blob = await offScreenCanvas.convertToBlob({ type: "image/jpeg" });
      // const dataURL = new FileReaderSync().readAsDataURL(blob);
      // console.log(dataURL);

      // bitmap.drawImage(bitmap);
      // bmpRenderer.transferFromImageBitmap(bitmap);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      // console.log("base64", offScreenCanvas.toDataURL());
    });

    // const blob = new Blob([videoFrames[0].data], { type: "image/jpeg" });

    // const blob = new Blob([videoFrames[0].data], { type: "image/png" });
    // const url = URL.createObjectURL(blob);

    try {
      const stream = await transport.createBidirectionalStream();
      const number = streamNumber++;

      const writer = stream.writable.getWriter();
      // await writer.write(data);
      // for (let i = 0; i < videoFrames.length; i++) {

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      const encoder = new TextEncoder("utf-8");
      // writer.write(
      //   encoder.encode(
      //     JSON.stringify({
      //       message: "video-frame",
      //     })
      //   )
      // );
      console.log(videoFrames[0]);
      console.log(videoFrames[0].data.length);
      // writer.write(videoFrames[0].data).then(() => {
      //   console.log("write done " + 0);
      // });
      // }
      await writer.close();

      console.log("Opened bidirectional stream #" + number + " with data: ");
    } catch (e) {
      console.log("Error while sending data: " + e, "error");
    }

    // const utf8decoder = new TextDecoder();

    // const compressed = pako.deflate(videoFrames[0].data);
    // const compressed = pako.gzip(videoFrames[0].data);
    // const original = videoFrames[0].data;
    // const uncompressed = pako.inflate(compressed);

    // console.log(compressed);
    // base64FromTypedArray(videoFrames[0].data).then((base64) => {
    //   pako.deflate(base64);
    // });
    // let unEqual = 0;
    // for (let i = 0; i < original.length; i++) {
    //   if (original[i] !== uncompressed[i]) {
    //     unEqual++;
    //   }
    // }
    // console.log(unEqual);

    // console.log(utf8decoder.decode(videoFrames[0].data));
    // console.log(
    //   videoFrames[0].data.reduce(
    //     (data, byte) => data + String.fromCharCode(byte),
    //     ""
    //   )
    // );

    // const reader = new FileReader();
    // reader.onload = function (event) {
    //   const base64 = event.target.result;
    //   console.log(base64);
    // };

    // reader.readAsDataURL(blob);

    // console.log(
    //   btoa(
    //     videoFrames[0].data.reduce(
    //       (data, byte) => data + String.fromCharCode(byte),
    //       ""
    //     )
    //   )
    // );
  }
};

self.postMessage(
  // eslint-disable-next-line
  //@ts-ignore
  []
);
