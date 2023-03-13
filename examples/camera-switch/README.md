# Switching between different AR cameras demo

![Preview](previews/preview.webp?raw=true "Preview")


To successfully run in 
- make sure `API_TOKEN_XR8` is defined in the index.html file
```
<script>
  const API_TOKEN_XR8 = "your 8thwall project API token";
</script>
```

- Make sure const `WEBXR_REQUIRED_FEATURES` and `WEBXR_OPTIONAL_FEATURES` are defined in the index.html file
```
<script>
      const WEBXR_REQUIRED_FEATURES = [{{ webxrRequiredFeatures }}];
      const WEBXR_OPTIONAL_FEATURES = [{{ webxrOptionalFeatures }}];
</script>
```
- Make sure the app is running on HTTPS.