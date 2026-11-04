import {
  DeleteMessageCommand,
  GetQueueUrlCommand,
  ReceiveMessageCommand,
} from "@aws-sdk/client-sqs";
import { config } from "./config.js";
import { sqs } from "./aws.js";
import { getMongo, initPostgres } from "./db.js";
import { generateThumbnail, initGallery } from "./thumbnails.js";

const { QueueUrl } = await sqs.send(new GetQueueUrlCommand({ QueueName: config.queueName }));
const db = await getMongo();
await initPostgres();
await initGallery();
console.log(`Worker polling ${QueueUrl}`);

// Long polling: the call waits up to 10s for messages instead of hammering the queue.
while (true) {
  const { Messages = [] } = await sqs.send(
    new ReceiveMessageCommand({ QueueUrl, MaxNumberOfMessages: 5, WaitTimeSeconds: 10 }),
  );

  for (const message of Messages) {
    try {
      const event = JSON.parse(message.Body);
      await db.collection("events").insertOne({ ...event, processedAt: new Date() });

      if (event.type === "file.uploaded") {
        const isImage = await generateThumbnail(event.key);
        console.log(isImage ? "Thumbnail created" : "Not an image, skipped", event.key);
      }
      console.log("Processed", event.type, event.key);

      // Delete only after success; otherwise SQS redelivers the message.
      await sqs.send(new DeleteMessageCommand({ QueueUrl, ReceiptHandle: message.ReceiptHandle }));
    } catch (err) {
      // Keep the message in the queue (do not delete) so it is retried later.
      console.error("Failed to process message, it will be retried:", err.message);
    }
  }
}
