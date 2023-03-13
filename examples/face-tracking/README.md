# Face tracking example

![Preview](previews/face-tracking.webp?raw=true "Simple Image target")

- `js/face-attachment-point-example.ts` - attaches the point to one of tracked face feature points (nose, ears, eyes, lips, etc)

- `js/face-mask-example.ts` - renders a generated mesh of the face, to which you can attach any texture.
___

Run face tracking using 8thwall. Provides examples of face mesh rendering and the usage of face attachment points.

To successfully run in 
- make sure `API_TOKEN_XR8` is defined in the index.html file
```
<script>
  const API_TOKEN_XR8 = "your 8thwall project API token";
</script>
```

- Make sure the app is running on HTTPS.