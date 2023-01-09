const S3 = require("aws-sdk/clients/s3");
require("dotenv").config();

const s3 = new S3({
  region: process.env.S3_BUCKET_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_ACCESS_PASS,
});

async function uploadFile(base64) { 
  const base64Data = new Buffer.from(
    base64.replace(/^data:image\/\w+;base64,/, ""),
    "base64"
  );

  const type = base64.split(";")[0].split("/")[1];

  const uploadParams = {
    Bucket: process.env.S3_BUCKET_NAME,
    Body: base64Data,
    ContentType: `image/${type}`,
    ContentEncoding: "base64",
    Key: `${Date.now()}.${type}`,
  };
  try {
    return await s3.upload(uploadParams).promise();
  } catch (err) {
    return console.log(err);
  }
}
exports.uploadFile = uploadFile;
