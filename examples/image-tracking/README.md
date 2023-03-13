# Image tracking camera demo

## Simple image target example
![Preview](previews/image-target.webp?raw=true "Simple Image target")

To test - point your camera at `textures/image-target-1-white.png`

___  

<br/>


## Dynamic textured mesh (plane) generation to render a correctly sized image onto the tracked target
![Preview](previews/flat-image-physical-size.webp?raw=true "Physically correct image size")

To test - point your camera at `textures/image-target-2-white.png`
___  

<br/>

## Dynamic textured mesh (plane) generation to render a correctly sized image onto the curved target
![Preview](previews/curved-image-target-video.webp?raw=true "Curved image target with video")

To test - point your camera at `previews/fanta.jpeg` for a quick & dirty test. To test how it really works - point your camera at the standard 0.5L "Fanta" bottle. Otherwise, print it out and stick on a bottle with a circumference of around 333mm.
___  

<br/>

To run:
- make sure `API_TOKEN_XR8` is defined in the index.html file
```
<script>
  const API_TOKEN_XR8 = "your 8thwall project API token";
</script>
```

