# Exact approved Swastha certificate image — deployment asset

The user supplied the approved PNG `Swastha Learning Clinic Completion Certificate(2).png`. The PDF renderer now uses its **actual raster pixels** as a background when the following asset exists:

`public/certificate-assets/approved-certificate-template.png`

## Source preparation
Crop exactly to the certificate paper, excluding the surrounding gray shadow: original source coordinates `(32, 31, 1377, 1027)`, output size `1345 × 996` pixels, RGB PNG. The resulting exact cropped asset is provided as `approved_certificate_template.png` in the conversation download. Do not recreate the artwork with shapes or replace the logo.

## Rendering
The PDF dimensions match this image's aspect ratio (297 × 220 mm). The image is used in full, and sample placeholders are masked only in their respective locations. Live fields replace Student Name, Course Title, Coordinator/Director names (name below role), Issue Date, reference and sample QR. The QR links to the actual verification reference. Student code is shown near the name. No handwritten signature appears.

## Safety gate
The GitHub connector available to this chat can write UTF-8 text and file blobs when supplied bytes but does not have direct binary access to the user-uploaded image. Therefore the exact PNG has **not** been committed by this change. Until it is installed at the path above, the PDF generator uses the existing working green polygonal fallback. Only once the asset is uploaded will the new exact image layout activate. Do not claim the exact design is already live.

## Test
CI checks the conditional background loading, correct template path, placeholder overlays, dynamic QR, and fallback. After manually installing the image, verify PDF output using an authorised test certificate, and confirm the QR reference against the public verification page.
