import webpush from "web-push";
import dotenv from "dotenv";

dotenv.config();

const initWebPush = (): void => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    throw new Error("VAPID keys are not defined");
  }

  webpush.setVapidDetails(
    "mailto:vitaliyoliynykk@gmail.com",
    publicKey,
    privateKey,
  );
};

export { initWebPush };
