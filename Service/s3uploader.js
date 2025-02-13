import AWS from "aws-sdk";
import dotenv from "dotenv";

dotenv.config();

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

export const uploadToS3 = async (fileBuffer, fileName, mimeType) => {
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: `attachments/${Date.now()}-${fileName}`, // Unique file name
    Body: fileBuffer,
    ContentType: mimeType
  };

  try {
    const uploadResult = await s3.upload(params).promise();
    return uploadResult.Location; // S3 file URL
  } catch (error) {
    console.error("S3 Upload Error:", error);
    return null;
  }
};
