import { v2 as cloudinary } from "cloudinary";
import { config } from "./env";

cloudinary.config({
  cloud_name: config.CLOUDINARY_CLOUD_NAME,
  api_key: config.CLOUDINARY_API_KEY,
  api_secret: config.CLOUDINARY_API_SECRET,
  secure: true,
});

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
}

export const uploadBufferToCloudinary = (
  buffer: Buffer,
  folder: string,
): Promise<CloudinaryUploadResult> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "auto",
      },
      (error, result) => {
        if (error || !result) {
          return reject(
            error || new Error("Cloudinary upload returned empty result"),
          );
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      },
    );

    uploadStream.end(buffer);
  });
};

export const deleteFromCloudinary = (publicId: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(
      publicId,
      { invalidate: true },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        if (result?.result !== "ok" && result?.result !== "not found") {
          return reject(
            new Error(
              `Cloudinary deletion failed for publicId ${publicId}: ${result?.result}`,
            ),
          );
        }
        resolve();
      },
    );
  });
};
