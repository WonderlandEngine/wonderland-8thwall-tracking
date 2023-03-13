# SLAM (World tracking) camera demo
![Preview](previews/SLAM-example.webp?raw=true "Dynamically generated mesh")
Runs an AR session using WebXR Device AP where available with a fallback to 8th-wall implementation.

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