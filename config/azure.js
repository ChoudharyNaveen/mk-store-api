const { BlobServiceClient } = require('@azure/storage-blob');
const stream = require('stream');
const fs = require('fs');
const config = require('./index');

const AZURE_STORAGE_CONNECTION_STRING = config.AZURE_BLOB_CONNECTION_STRING;
const CONTAINER_NAME = config.AZURE_CONTAINER_NAME;

function getBlobServiceClient() {
  if (AZURE_STORAGE_CONNECTION_STRING) {
    return BlobServiceClient.fromConnectionString(
      AZURE_STORAGE_CONNECTION_STRING,
    );
  }
  throw new Error(
    'Azure Storage connection string is not configured properly.',
  );
}

async function uploadFile(file, blobName, containerName = CONTAINER_NAME) {
  const blobServiceClient = getBlobServiceClient();
  const containerClient = blobServiceClient.getContainerClient(containerName);

  await containerClient.createIfNotExists();

  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  const options = {
    blobHTTPHeaders: {
      blobContentType: file.mimetype,
      contentDisposition: `attachment; filename="${blobName}"`,
    },
  };

  const bufferStream = new stream.PassThrough();

  bufferStream.end(file.buffer);

  await blockBlobClient.uploadStream(
    bufferStream,
    undefined,
    undefined,
    options,
  );

  return blockBlobClient.url;
}

async function uploadVideo(filePath, blobName, containerName = CONTAINER_NAME) {
  const blobServiceClient = getBlobServiceClient();
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  const uploadOptions = { blobHTTPHeaders: { blobContentType: 'video/mp4' } };

  if (filePath.buffer) {
    await blockBlobClient.uploadData(filePath.buffer, uploadOptions);
  } else if (filePath.path) {
    const fileStream = fs.createReadStream(filePath.path);

    await blockBlobClient.uploadStream(
      fileStream,
      undefined,
      undefined,
      uploadOptions,
    );
  } else {
    throw new Error('no buffer');
  }
  console.log('upload successful');

  return blockBlobClient.url;
}

module.exports = { uploadFile, uploadVideo };
