# XR8 SLAM (World tracking) with absolute scale camera demo
Setting the scale to “absolute” will dynamically set the virtual camera height to the actual height of the device camera. To estimate scale, the 8th Wall Engine needs data to determine the height of the camera, this requires users to move their device to generate data for determining scale. Device camera position is defined in meters.

To successfully run in 
- make sure `API_TOKEN_XR8` is defined in the index.html file
```
<script>
  const API_TOKEN_XR8 = "your 8thwall project API token";
</script>
```

- Make sure the app is running on HTTPS.