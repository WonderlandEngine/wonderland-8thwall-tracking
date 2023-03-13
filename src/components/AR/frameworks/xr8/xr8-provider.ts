import * as QRCode from "qrcode-svg";
import { ARProvider } from "../../AR-provider";
import { IXR8UIHandler } from "./ixr8-ui-handler";

/**
  * Array of extra permissions which some tracking mode might need. By default XR8 will need camera/microphone permissions and deviceMotion permission (iOS only). VPS for example must pass an extra 'location' permission
  */
export type XR8ExtraPermissions = Array<'location'>;

class XR8Provider extends ARProvider {

  public get tag() {
    return "xr8";
  }

  public uiHandler: IXR8UIHandler = new DefaultUIHandler;

  public cachedWebGLContext: WebGL2RenderingContext | null = null;
  // Loading of 8thwall might be initiated by several components, make sure we load it only once
  private loading = false;

  // XR8 currently provides no way to check if the session is running, only if the session is paused (and we never pause, we just XR8.end()). so we track this manually
  private running = false;

  // Enforce the singleton pattern
  private instance: XR8Provider | null = null;

  constructor() {
    super();

    // Safeguard that we are not running inside the editor
    if (typeof (document) === 'undefined') {
      return;
    }

    if (this.instance !== null) {
      throw "WebXRProvider cannot be instantiated";
    }

    this.instance = this;
  }

  public async load() {
    // Make sure we're no in the editor
    if (!window.document) {
      return;
    }

    if (this.loading) {
      return;
    }

    this.loading = true;

    return new Promise<void>((resolve, _reject) => {
      // Just some safety flag, if 8thwall was loaded before by something, like a index.html file
      if (window['XR8']) {
        resolve();
        return;
      }

      if (!API_TOKEN_XR8) {
        throw new Error('8thwall api is not defined');
      }

      const s = document.createElement('script');
      s.crossOrigin = 'anonymous';
      s.src = 'https://apps.8thwall.com/xrweb?appKey=' + API_TOKEN_XR8;

      window.addEventListener('xrloaded', () => {
        this.loaded = true;

        document.querySelector('#WL-loading-8thwall-logo')?.remove();

        XR8.addCameraPipelineModules([
          XR8.GlTextureRenderer.pipelineModule(),
          {
            name: 'WLE-XR8-setup',
            onStart: () => {
              this.running = true;
              this.enableCameraFeed();
            },

            onDetach: () => {
              this.running = false;
              this.disableCameraFeed();
            },

            onException: (message) => {
              this.uiHandler.handleError(new CustomEvent('8thwall-error', { detail: { message } }));
            }
          }
        ]);
        resolve();
      });

      document.body.appendChild(s);
      // Wait until index.html has been fully parsed and append the 8thwall logo
      document.readyState === 'complete' ? this.add8thwallLogo() : document.addEventListener('DOMContentLoaded', () => this.add8thwallLogo);
    })
  };

  public async startSession(options: Parameters<typeof XR8.run>[0]) {
    XR8.run(options)
    this.onSessionStarted.forEach(cb => cb(this));
  };

  public async endSession() {
    if (this.running) {
      XR8.stop();
      this.onSessionEnded.forEach(cb => cb(this));
    }
  };

  public enableCameraFeed() {
    // TODO: should we store the previous state of colorClearEnabled.
    WL.scene.colorClearEnabled = false;

    if (!this.cachedWebGLContext) {
      this.cachedWebGLContext = WL.canvas.getContext("webgl2");
    }

    if (!WL.scene.onPreRender.includes(this.onWLPreRender)) {
      WL.scene.onPreRender.push(this.onWLPreRender)
    }

    if (!WL.scene.onPostRender.includes(this.onWLPostRender)) {
      WL.scene.onPostRender.push(this.onWLPostRender)
    }
  };

  public disableCameraFeed() {
    const indexPrerender = WL.scene.onPreRender.indexOf(this.onWLPreRender);
    if (indexPrerender !== -1) {
      WL.scene.onPreRender.splice(indexPrerender);
    }

    const indexPostRender = WL.scene.onPostRender.indexOf(this.onWLPostRender);
    if (indexPostRender !== -1) {
      WL.scene.onPostRender.splice(indexPostRender);
    }
  };

  public onWLPreRender = () => {
    this.cachedWebGLContext!.bindFramebuffer(this.cachedWebGLContext!.DRAW_FRAMEBUFFER, null);
    XR8.runPreRender(Date.now());
    XR8.runRender(); // <--- tell 8thwall to do it's thing (alternatively call this.GlTextureRenderer.onRender() if you only care about camera feed )
  };

  public onWLPostRender() {
    XR8.runPostRender(Date.now())
  };

  private add8thwallLogo() {
    const a = document.createElement('a');
    a.href = 'https://www.8thwall.com/';
    a.target = '_blank';
    a.style.position = 'absolute';
    a.style.bottom = '20px';
    a.style.left = '0';
    a.style.right = '0';
    a.style.margin = '0 auto';
    a.style.width = '252px';
    a.style.zIndex = '999';
    // a.style.pointerEvents='none';
    a.id = 'WL-loading-8thwall-logo';
    a.innerHTML = xr8logo;
    document.body.appendChild(a);
  };


  private async promptForDeviceMotion() {
    // wait until user interaction happens
    await this.uiHandler.requestUserInteraction();

    // wait until motion permissions has happened
    const motionEvent = await (DeviceMotionEvent as any).requestPermission();
    return motionEvent;
  }

  private async getPermissions(extraPermissions: XR8ExtraPermissions = []) {
    // iOS "feature". If we want to request the DeviceMotion permission, user has to interact with the page at first (touch it).
    // If there was no interaction done so far, we will render a HTML overlay with would get the user to interact with the screen
    if (DeviceMotionEvent && (DeviceMotionEvent as any).requestPermission) {
      try {
        const result = await (DeviceMotionEvent as any).requestPermission();

        // The user must have rejected the motion event on previous page load. (safari remembers this choice).
        if (result !== 'granted') {
          throw new Error('MotionEvent');
        }
      } catch (exception: any) {

        // User had no interaction with the page so far
        if (exception.name === 'NotAllowedError') {
          const motionEvent = await this.promptForDeviceMotion();
          if (motionEvent !== 'granted') {
            throw new Error('MotionEvent');
          }
        } else {
          throw new Error('MotionEvent');
        }
      }
    }

    try {
      // make sure we get the camera stream
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })

      // If we successfully acquired the camera stream - we can stop it and wait until 8thwall requests it again
      // Update - if we don't stop it, xr8 initializes faster
      /* stream.getTracks().forEach((track) => {
         track.stop();
       });*/

    } catch (exception) {
      throw new Error('Camera');
    }

    if (extraPermissions.includes('location')) {

      this.uiHandler.showWaitingForDeviceLocation();

      return new Promise<void>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition((position) => {
          this.uiHandler.hideWaitingForDeviceLocation();
          resolve();
        }, (_error) => {
          this.uiHandler.hideWaitingForDeviceLocation();
          reject(new Error("Location"));
        });
      });
    }
    return true;
  };

  public async checkPermissions(extraPermissions: XR8ExtraPermissions = []) {
    if (!XR8.XrDevice.isDeviceBrowserCompatible()) {
      this.uiHandler.handleIncompatibleDevice()
      return;
    }

    try {
      await this.getPermissions(extraPermissions);
      return true;
    } catch (error: unknown) {
      // User did not grant the camera or motionEvent permissions
      this.uiHandler.handlePermissionFail(error as Error);
      return false;
    }
  }
}

class DefaultUIHandler implements IXR8UIHandler {
  requestUserInteraction = () => {
    const overlay = this.showOverlay(requestPermissionOverlay);
    return new Promise<void>((resolve) => {
      const button = document.querySelector<HTMLButtonElement>('#request-permission-overlay-button');
      button?.addEventListener('click', () => {
        overlay.remove();
        resolve();
      });
    })
  };

  handlePermissionFail(error: Error) {
    console.log("Permission failed", error);
    this.showOverlay(failedPermissionOverlay(error.message));
  };


  handleError = (error: Event) => {
    console.error("XR8 encountered an error", error);
    this.showOverlay(runtimeErrorOverlay((error as CustomEvent).detail.message));
  };

  showWaitingForDeviceLocation = () => {
    this.showOverlay(waitingForDeviceLocationOverlay);
  };

  hideWaitingForDeviceLocation = () => {
    const overlay = document.querySelector("#waiting-for-device-location-overlay");
    if (overlay) {
      overlay.remove();
    }
  };

  handleIncompatibleDevice = () => {
    this.showOverlay(deviceIncompatibleOverlay());
  };

  showOverlay = (htmlContent: string) => {
    const overlay = document.createElement('div');
    overlay.innerHTML = htmlContent;
    document.body.appendChild(overlay);
    return overlay;
  }
}

const overlayStyles = `
<style>
.xr8-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 999;
  color: #fff;
  background-color: rgba(0, 0, 0, 0.5);
  text-align: center;
  font-family: sans-serif;
  display: flex;
  flex-direction: column;
  font-size: 32px;
  padding: 30px;
  box-sizing: border-box;
}

.xr8-overlay-wle-logo {
  height: 100px;
}

.xr8-overlay-wle-logo img {
  width: 300px;
}

.xr8-overlay-description {
  flex-grow: 1;
}

.xr8-overlay-button {
  background-color: #e80086;
  font-size: 22px;
  padding: 10px 30px;
  color: #fff;
  border-radius: 15px;
  border: none;
}
</style>
`

const overlayLogo = `
  <div class="xr8-overlay-wle-logo">
    <img src="data:image/png;base64,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" />
  </div>
`

const requestPermissionOverlay = `
${overlayStyles}
<div id="request-permission-overlay" class="xr8-overlay">
   ${overlayLogo}
    <div class="xr8-overlay-description">This app requires to use your camera and motion sensors</div>
    <button class="xr8-overlay-button" id="request-permission-overlay-button">ALLOW</button>
</div>`;

const failedPermissionOverlay = (reason: string) => `
  ${overlayStyles}
  <div id="failed-permission-overlay" class="xr8-overlay">
  ${overlayLogo}
  <div class="xr8-overlay-description">Failed to grant permissions [${reason}]. Reset the the permissions and
      refresh the page.</div>

  <button class="xr8-overlay-button" onclick="window.location.reload()">Refresh the page</button>
  </div>
`;

const runtimeErrorOverlay = (message: string) => `
  <div class="xr8-overlay">
  ${overlayLogo}
  <div class="xr8-overlay-description">Error has occurred. Please reload the page<br />${message}</div>
  <button class="xr8-overlay-button" onclick="window.location.reload()">Refresh the page</button>
  </div>
`;

const waitingForDeviceLocationOverlay = `
${overlayStyles}
<style>
.container {
  width: 64px;
  height: 64px;
  perspective: 1000px;
  margin: 64px auto 0;
}

.cube {
  transform-style: preserve-3d;
  width: 100%;
  height: 100%;
  position: relative;
  animation: spin 5s infinite linear;
}

.face {
  position: absolute;
  width: 100%;
  height: 100%;
}

.top {
  transform: rotateX(90deg) translateZ(32px);
  background-color: rgba(255, 0, 183, 255);
}

.right {
  transform: rotateY(90deg) translateZ(32px);
  background-color: rgba(255, 255, 0, 255);
}

.front {
  transform: rotateX(0deg) translateZ(32px);
  background-color: rgba(0, 200, 100, 255);
}


.bottom {
  transform: rotateX(-90deg) translateZ(32px);
  background-color: rgba(255, 0, 183, 255);
}


.left {
  transform: rotateY(-90deg) translateZ(32px);
  background-color: rgba(255, 255, 0, 255);
}

.back {
  transform: rotateX(-180deg) translateZ(32px);
  background-color: rgba(0, 200, 100, 255);
}

@keyframes spin {
  from {
    transform: rotateX(0deg) rotateY(0deg);
  }

  to {
    transform: rotateX(360deg) rotateY(360deg);
  }
}
</style>

<div id="waiting-for-device-location-overlay" class="xr8-overlay">
${overlayLogo}
<div class="xr8-overlay-description"> Waiting for device location...
  <div class="container">
    <div class="cube">
      <div class="face front"></div>
      <div class="face back"></div>
      <div class="face right"></div>
      <div class="face left"></div>
      <div class="face top"></div>
      <div class="face bottom"></div>
    </div>
  </div>
</div>
</div>
`;

const deviceIncompatibleOverlay = () => {
  // @ts-ignore ts(2339) 'qrcode-svg' has some funny export definition
  const svg = new QRCode.default({
    content: window.location.href,
    width: 200,
    height: 200
  }).svg();


  const html = `
    ${overlayStyles}
    <style>
    #xr8-overlay-epxerience-url {
      font-size: 24px;
    }

    #xr8-overlay-qr-code {
      margin: 20px 0;
    }
  </style>
  <div id="failed-permission-overlay" class="xr8-overlay">
  ${overlayLogo}
    <div class="xr8-overlay-description">
      This device is not compatible with 8thwall. Please open it using your mobile device.<br />
      <div id="xr8-overlay-qr-code">${svg}</div>
      <br />
      <div id="xr8-overlay-epxerience-url">${window.location.href}</div>
    </div>
  </div>`;

  return html;
}


const xr8logo = `
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="Layer_1" x="0px" y="0px" width="252px" height="48px" viewBox="0 0 252 48" style="enable-background:new 0 0 252 48;" xml:space="preserve"><script xmlns=""/>
      <style type="text/css">
        .st0{fill:#fff;}
      </style>
      <g id="Logo_-_Shape">
        <path class="st0" d="M8.32466,26.20464c-0.67188-0.42676-1.46289-0.64062-2.37305-0.64062   c-0.92383,0-1.71484,0.23096-2.37305,0.69287c-0.48096,0.33765-0.84302,0.75977-1.0918,1.26208v-0.94714   c0-0.32178-0.08105-0.56299-0.24121-0.72412c-0.16113-0.16113-0.39551-0.2417-0.7041-0.2417   c-0.29395,0-0.52441,0.08057-0.69238,0.2417s-0.25195,0.40234-0.25195,0.72412v12.36914c0,0.30762,0.08398,0.5459,0.25195,0.71387   s0.39844,0.25195,0.69238,0.25195c0.30859,0,0.54688-0.08398,0.71484-0.25195s0.25195-0.40625,0.25195-0.71387v-4.71436   c0.24902,0.4942,0.61108,0.91217,1.0918,1.24951c0.6582,0.46191,1.44141,0.69287,2.35156,0.69287s1.7041-0.21338,2.38379-0.64062   c0.67871-0.42676,1.2041-1.04248,1.5752-1.84766c0.37012-0.80518,0.55664-1.74658,0.55664-2.82471   c0-1.0918-0.18945-2.0332-0.56738-2.82471c-0.37793-0.79053-0.90332-1.39941-1.5752-1.82666L8.32466,26.20464z M8.15669,32.93511   c-0.25195,0.56006-0.60547,0.98682-1.06055,1.28076s-0.9834,0.44092-1.58496,0.44092c-0.92383,0-1.65918-0.3252-2.20508-0.97607   c-0.5459-0.65137-0.81934-1.59277-0.81934-2.82471c0-0.82568,0.12207-1.51904,0.36719-2.0791   c0.24512-0.55957,0.5957-0.9834,1.05078-1.27051c0.4541-0.28662,0.99023-0.43018,1.60645-0.43018   c0.92383,0,1.65918,0.32227,2.20508,0.96582c0.5459,0.64404,0.81836,1.58203,0.81836,2.81396   C8.53462,31.68217,8.40864,32.37504,8.15669,32.93511z"/>
        <path class="st0" d="M19.89595,26.21489c-0.74219-0.43359-1.61719-0.65088-2.625-0.65088   c-0.75586,0-1.43848,0.12256-2.04785,0.36768c-0.6084,0.24512-1.12988,0.59814-1.56445,1.06055   c-0.43359,0.46191-0.76562,1.01807-0.99707,1.66943c-0.23145,0.65088-0.34668,1.38281-0.34668,2.19434   c0,1.07812,0.20312,2.01611,0.60938,2.81396c0.40527,0.79785,0.97949,1.41406,1.72168,1.84814s1.61719,0.65088,2.625,0.65088   c0.75586,0,1.43848-0.12256,2.04785-0.36768c0.6084-0.24463,1.12988-0.59814,1.56445-1.06006   c0.43359-0.4624,0.7666-1.02197,0.99707-1.68018c0.23145-0.65771,0.34668-1.39307,0.34668-2.20508   c0-1.07764-0.20312-2.01221-0.60938-2.80371C21.21138,27.26175,20.63814,26.64896,19.89595,26.21489z M19.9272,32.9351   c-0.24512,0.56006-0.59473,0.98682-1.0498,1.28076s-0.99023,0.44092-1.60645,0.44092c-0.91016,0-1.6416-0.3252-2.19434-0.97607   c-0.55371-0.65137-0.8291-1.59277-0.8291-2.82471c0-0.82568,0.12598-1.51904,0.37793-2.0791   c0.25195-0.55957,0.60547-0.9834,1.06055-1.27051c0.4541-0.28662,0.9834-0.43018,1.58496-0.43018   c0.92383,0,1.65918,0.32227,2.20508,0.96582c0.5459,0.64404,0.81934,1.58203,0.81934,2.81396   C20.29537,31.68217,20.17232,32.37503,19.9272,32.9351z"/>
        <path class="st0" d="M39.13228,25.606c-0.22461,0-0.41309,0.05273-0.56738,0.15771s-0.28027,0.29736-0.37793,0.57715   l-2.65674,7.42999l-2.65674-7.42999c-0.07031-0.25195-0.18848-0.43701-0.35645-0.55615S32.13911,25.606,31.88716,25.606   c-0.23828,0-0.43848,0.05957-0.59863,0.17871c-0.16113,0.11914-0.29102,0.3042-0.38867,0.55615l-2.68506,7.40179l-2.60693-7.3598   c-0.09766-0.29395-0.2168-0.49658-0.35742-0.60889c-0.13965-0.11182-0.3291-0.16797-0.56641-0.16797   c-0.25195,0-0.45508,0.05615-0.60938,0.16797c-0.1543,0.1123-0.25195,0.26611-0.29395,0.46191   c-0.04199,0.19629-0.01367,0.42725,0.08398,0.69336l3.12891,8.33691c0.1123,0.30811,0.26562,0.52832,0.46191,0.66113   c0.19629,0.1333,0.42676,0.19971,0.69336,0.19971c0.28027,0,0.51758-0.07031,0.71387-0.20996s0.34961-0.35693,0.46191-0.65088   l2.52002-6.90814l2.52002,6.90814c0.1123,0.29395,0.26953,0.51123,0.47266,0.65088s0.4375,0.20996,0.70312,0.20996   c0.2666,0,0.50098-0.07031,0.7041-0.20996c0.20215-0.13965,0.35352-0.35693,0.45117-0.65088l3.12891-8.33691   c0.08398-0.22412,0.11523-0.4375,0.09473-0.64062c-0.02148-0.20264-0.09473-0.36768-0.2207-0.49365   S39.38424,25.606,39.13228,25.606z"/>
        <path class="st0" d="M50.71333,31.1187c0.13281-0.11914,0.19922-0.29053,0.19922-0.51465c0-0.78369-0.10156-1.4873-0.30469-2.11035   s-0.50098-1.15137-0.89258-1.58545s-0.86426-0.7666-1.41699-0.99756c-0.55371-0.23096-1.17285-0.34668-1.8584-0.34668   c-0.9668,0-1.82422,0.22412-2.57324,0.67188c-0.74902,0.44824-1.33691,1.07129-1.76367,1.86914s-0.64062,1.729-0.64062,2.79297   c0,1.07812,0.2168,2.0127,0.65137,2.80371c0.43359,0.79102,1.0459,1.3999,1.83691,1.82666   c0.79102,0.42725,1.74023,0.64062,2.8457,0.64062c0.58789,0,1.2002-0.0874,1.83789-0.2627   c0.63672-0.1748,1.18652-0.42285,1.64844-0.74512c0.19531-0.12598,0.3291-0.27295,0.39844-0.44092   c0.07031-0.16846,0.0918-0.32568,0.06348-0.47266s-0.09863-0.27295-0.20996-0.37793   c-0.1123-0.10498-0.25586-0.16113-0.43066-0.16797s-0.36719,0.05225-0.57715,0.17822   c-0.43457,0.29395-0.88574,0.49707-1.35449,0.60889c-0.46973,0.1123-0.92773,0.16797-1.37598,0.16797   c-1.13379,0-2.00195-0.32178-2.60352-0.96582c-0.52417-0.55981-0.80591-1.36755-0.87402-2.39404h6.81641   c0.25195,0,0.44434-0.05908,0.57812-0.17822L50.71333,31.1187z M43.34639,30.07915c0.05298-0.48199,0.14478-0.93707,0.32104-1.3335   c0.25195-0.56689,0.61621-1.0083,1.0918-1.32324c0.47656-0.31494,1.05078-0.47217,1.72266-0.47217   c0.61523,0,1.12988,0.13281,1.54297,0.39893s0.72754,0.6543,0.94531,1.16553c0.1853,0.43689,0.27466,0.96936,0.30151,1.56445   C49.27168,30.07915,43.34639,30.07915,43.34639,30.07915z"/>
        <path class="st0" d="M58.5356,25.54301c-0.93848,0.05615-1.71484,0.30127-2.33105,0.73486   c-0.45923,0.32343-0.80859,0.76044-1.0498,1.3092v-1.01526c0-0.32178-0.08105-0.56299-0.24219-0.72412   s-0.3877-0.2417-0.68262-0.2417c-0.29395,0-0.52441,0.08057-0.69238,0.2417s-0.25195,0.40234-0.25195,0.72412v8.56836   c0,0.32227,0.08398,0.56689,0.25195,0.73486s0.41309,0.25195,0.73438,0.25195c0.30859,0,0.54297-0.08398,0.7041-0.25195   s0.24121-0.4126,0.24121-0.73486v-4.91406c0-0.88232,0.24902-1.5752,0.74609-2.0791   c0.49609-0.50391,1.20703-0.80469,2.13086-0.90283l0.37793-0.021c0.29395-0.02783,0.51074-0.12256,0.65137-0.28369   c0.13965-0.16064,0.20312-0.37451,0.18848-0.64062c-0.01367-0.27979-0.09082-0.479-0.23047-0.59814   c-0.14062-0.11914-0.32227-0.17139-0.5459-0.15771L58.5356,25.54301z"/>
        <path class="st0" d="M69.44575,31.1187c0.13281-0.11914,0.19922-0.29053,0.19922-0.51465c0-0.78369-0.10156-1.4873-0.30469-2.11035   s-0.50098-1.15137-0.89258-1.58545s-0.86426-0.7666-1.41699-0.99756c-0.55371-0.23096-1.17285-0.34668-1.8584-0.34668   c-0.9668,0-1.82422,0.22412-2.57324,0.67188c-0.74902,0.44824-1.33691,1.07129-1.76367,1.86914s-0.64062,1.729-0.64062,2.79297   c0,1.07812,0.2168,2.0127,0.65137,2.80371c0.43359,0.79102,1.0459,1.3999,1.83691,1.82666   c0.79102,0.42725,1.74023,0.64062,2.8457,0.64062c0.58789,0,1.2002-0.0874,1.83789-0.2627   c0.63672-0.1748,1.18652-0.42285,1.64844-0.74512c0.19531-0.12598,0.3291-0.27295,0.39844-0.44092   c0.07031-0.16846,0.0918-0.32568,0.06348-0.47266s-0.09863-0.27295-0.20996-0.37793   c-0.1123-0.10498-0.25586-0.16113-0.43066-0.16797s-0.36719,0.05225-0.57715,0.17822   c-0.43457,0.29395-0.88574,0.49707-1.35449,0.60889c-0.46973,0.1123-0.92773,0.16797-1.37598,0.16797   c-1.13379,0-2.00195-0.32178-2.60352-0.96582c-0.52417-0.55981-0.80591-1.36755-0.87402-2.39404h6.81641   c0.25195,0,0.44434-0.05908,0.57812-0.17822L69.44575,31.1187z M62.07881,30.07915c0.05298-0.48199,0.14478-0.93707,0.32104-1.3335   c0.25195-0.56689,0.61621-1.0083,1.0918-1.32324c0.47656-0.31494,1.05078-0.47217,1.72266-0.47217   c0.61523,0,1.12988,0.13281,1.54297,0.39893s0.72754,0.6543,0.94531,1.16553c0.1853,0.43689,0.27466,0.96936,0.30151,1.56445   C68.0041,30.07915,62.07882,30.07915,62.07881,30.07915z"/>
        <path class="st0" d="M80.31294,21.02788c-0.30859,0-0.54297,0.08105-0.7041,0.2417   c-0.16016,0.16113-0.24121,0.40234-0.24121,0.72461v5.49274c-0.24927-0.49304-0.61084-0.90784-1.0918-1.2403   c-0.6582-0.45508-1.44238-0.68262-2.35156-0.68262c-0.91113,0-1.70508,0.21387-2.38379,0.64062   c-0.67969,0.42725-1.2041,1.03613-1.5752,1.82666c-0.37109,0.7915-0.55664,1.73291-0.55664,2.82471   c0,1.07812,0.18945,2.01953,0.56738,2.82471s0.90625,1.4209,1.58496,1.84766c0.67969,0.42725,1.4668,0.64062,2.36328,0.64062   c0.90918,0,1.69727-0.23096,2.3623-0.69287c0.47998-0.3338,0.83789-0.75476,1.08105-1.2569v0.92096   c0,0.32227,0.08398,0.56689,0.25195,0.73486s0.39941,0.25195,0.69336,0.25195c0.30762,0,0.5459-0.08398,0.71387-0.25195   s0.25195-0.4126,0.25195-0.73486v-13.146c0-0.32227-0.08398-0.56348-0.25195-0.72461   c-0.16797-0.16064-0.40625-0.2417-0.71387-0.2417L80.31294,21.02788z M79.02095,32.93511   c-0.24512,0.56006-0.59473,0.98682-1.0498,1.28076s-0.99023,0.44092-1.60645,0.44092c-0.91016,0-1.6416-0.3252-2.19434-0.97607   c-0.55371-0.65137-0.8291-1.59277-0.8291-2.82471c0-0.82568,0.12598-1.51904,0.37793-2.0791   c0.25195-0.55957,0.60547-0.9834,1.06055-1.27051c0.4541-0.28662,0.9834-0.43018,1.58496-0.43018   c0.92383,0,1.65918,0.32227,2.20508,0.96582c0.5459,0.64404,0.81934,1.58203,0.81934,2.81396   C79.38911,31.68218,79.26607,32.37505,79.02095,32.93511z"/>
        <path class="st0" d="M97.56392,26.20464c-0.67969-0.42676-1.47363-0.64062-2.38379-0.64062s-1.69336,0.22754-2.35156,0.68262   c-0.48071,0.33234-0.84277,0.74695-1.0918,1.23969V21.9942c0-0.32227-0.08398-0.56348-0.25195-0.72461   c-0.16797-0.16064-0.40625-0.2417-0.71484-0.2417c-0.29395,0-0.52441,0.08105-0.69238,0.2417   c-0.16797,0.16113-0.25195,0.40234-0.25195,0.72461v13.146c0,0.32227,0.08398,0.56689,0.25195,0.73486   s0.39844,0.25195,0.69238,0.25195c0.30859,0,0.54297-0.08398,0.7041-0.25195c0.16016-0.16797,0.24121-0.4126,0.24121-0.73486   v-0.93738c0.24878,0.50977,0.61084,0.93567,1.0918,1.27332c0.6582,0.46191,1.44922,0.69287,2.37305,0.69287   c0.91016,0,1.70117-0.21338,2.37305-0.64062c0.67188-0.42676,1.19727-1.04248,1.5752-1.84766s0.56738-1.74658,0.56738-2.82471   c0-1.0918-0.18652-2.0332-0.55664-2.82471C98.76803,27.24077,98.24265,26.63189,97.56392,26.20464z M97.38521,32.93511   c-0.25195,0.56006-0.60547,0.98682-1.06055,1.28076s-0.9834,0.44092-1.58496,0.44092c-0.92383,0-1.65918-0.3252-2.20508-0.97607   c-0.5459-0.65137-0.81934-1.59277-0.81934-2.82471c0-0.82568,0.12207-1.51904,0.36719-2.0791   c0.24512-0.55957,0.5957-0.9834,1.05078-1.27051c0.4541-0.28662,0.99023-0.43018,1.60645-0.43018   c0.92383,0,1.65918,0.32227,2.20508,0.96582c0.5459,0.64404,0.81836,1.58203,0.81836,2.81396   C97.76314,31.68217,97.63716,32.37504,97.38521,32.93511z"/>
        <path class="st0" d="M110.56197,25.79497c-0.13281-0.12598-0.31836-0.18896-0.55664-0.18896   c-0.26562,0-0.47559,0.05615-0.62988,0.16797c-0.1543,0.1123-0.28711,0.30811-0.39844,0.58789l-3.06348,7.4093l-3.00586-7.4093   c-0.12598-0.27979-0.25879-0.47559-0.39941-0.58789c-0.13965-0.11182-0.3291-0.16797-0.56641-0.16797   c-0.28027,0-0.50098,0.06299-0.66211,0.18896s-0.25488,0.28711-0.2832,0.48291c-0.02832,0.19629,0.00684,0.41309,0.10547,0.65137   l3.79492,8.83533l-1.25391,2.84045c-0.09863,0.22363-0.13672,0.4375-0.11621,0.64062   c0.02148,0.20264,0.10547,0.36377,0.25195,0.48291c0.14746,0.11865,0.33301,0.17822,0.55664,0.17822   c0.26562,0,0.47266-0.05225,0.62012-0.15723c0.14648-0.10498,0.29004-0.30469,0.42969-0.59863l5.29199-12.24268   c0.1123-0.22412,0.1543-0.43408,0.12598-0.63037C110.77585,26.08207,110.69479,25.92094,110.56197,25.79497z"/>
        <path class="st0" d="M199.81953,12.86967h48.86694c1.65649,0,2.99902-1.34271,2.99902-2.99896V2.99895   c0-1.65625-1.34253-2.99897-2.99902-2.99897h-48.86694c-1.65625,0-2.99902,1.34271-2.99902,2.99896v6.87177   C196.82051,11.52696,198.16328,12.86967,199.81953,12.86967z M197.0461,2.99894c0-1.52924,1.24438-2.77338,2.77344-2.77338   h48.86694c1.5293,0,2.77344,1.24414,2.77344,2.77338v6.87177c0,1.52924-1.24414,2.77338-2.77344,2.77338h-48.86694   c-1.52905,0-2.77344-1.24414-2.77344-2.77338V2.99895V2.99894z"/>
        <polygon class="st0" points="202.23286,5.93364 205.82661,9.72191 206.41499,9.72191 206.41499,3.15282 205.00337,3.15282    205.00337,6.98357 201.39839,3.18553 201.36958,3.15282 200.81929,3.15282 200.81929,9.72191 202.23286,9.72191  "/>
        <rect x="209.40913" y="3.14769" class="st0" width="1.40796" height="6.57422"/>
        <polygon class="st0" points="223.83028,5.93364 227.42451,9.72191 228.01216,9.72191 228.01216,3.15282 226.60152,3.15282    226.60152,6.98357 222.96529,3.15282 222.41695,3.15282 222.41695,9.72191 223.83028,9.72191  "/>
        <polygon class="st0" points="232.66743,9.72191 234.07954,9.72191 234.07954,4.55247 236.09102,4.55247 236.09102,3.15282    230.65767,3.15282 230.65767,4.55247 232.66743,4.55247  "/>
        <rect x="238.77168" y="3.14769" class="st0" width="1.40698" height="6.57422"/>
        <path class="st0" d="M246.04585,9.72173h0.00024c0.82788,0,1.44165-0.25317,2.11841-0.87372l0.07739-0.07013l-0.93896-1.08508   l-0.07568,0.06543c-0.37427,0.3186-0.65845,0.48047-1.17383,0.48047c-0.51099,0-0.92725-0.16498-1.23706-0.49017   c-0.31128-0.32434-0.47046-0.77271-0.47339-1.33203c0-0.52155,0.15747-0.95312,0.46826-1.28278   c0.30933-0.33093,0.72485-0.49988,1.23486-0.50232c0.50269,0,0.79248,0.16364,1.18188,0.48621l0.07593,0.06165l0.93774-1.08063   l-0.07666-0.07056c-0.67529-0.6217-1.28931-0.87549-2.1189-0.87549c-0.87671,0-1.6228,0.31793-2.21729,0.94495   c-0.59375,0.62854-0.896,1.41162-0.89795,2.32782c0,0.93585,0.30127,1.72711,0.89551,2.35144   c0.59692,0.62372,1.34375,0.94165,2.21948,0.94495V9.72173z"/>
        <path class="st0" d="M215.33199,8.74687h2.59424l0.36157,0.97504l1.50562-0.00549l-2.49023-6.56372h-1.34766l-2.43896,6.42389   l-0.0542,0.14532h1.50854C214.9709,9.72191,215.33199,8.74687,215.33199,8.74687z M216.65889,5.18736l0.76685,2.08191   l-1.57031,0.01886L216.65889,5.18736z"/>
        <path class="st0" d="M210.17964,18.56548c-0.97754,0.00049-1.80859,0.66742-2.01685,1.6059l-4.29419,16.09668l-3.52295-14.42322   c-0.229-0.92432-1.05518-1.57074-2.0083-1.57123h-3.05225c-0.95215,0.00049-1.77808,0.64642-2.00806,1.57269l-3.52026,14.42126   l-4.29004-16.08099c-0.2124-0.95367-1.04321-1.62061-2.02075-1.62109h-3.75513l6.83276,24.40314l0.07739,0.27399h4.58276   c0.93848-0.00391,1.75952-0.63898,1.99536-1.5462c1.02563-3.91199,2.85474-11.60242,3.63281-14.89099   c0.77783,3.28857,2.60889,10.979,3.6333,14.89099c0.23706,0.90723,1.05811,1.5423,1.99658,1.5462h4.58276l6.90991-24.67712   h-3.75488V18.56548z"/>
        <path class="st0" d="M172.43257,24.41563c-1.19971-0.65521-2.59717-0.99677-3.9104-0.96295   c-1.2019-0.00934-2.35962,0.22845-3.45068,0.71436c-0.62329,0.27063-1.24487,0.74719-1.88379,1.44788v-5.02808   c0.01367-0.54462-0.18604-1.06183-0.56177-1.45673c-0.37573-0.39435-0.88281-0.61896-1.48755-0.63312h-3.43872v24.73584h3.43677   c0.51978-0.02545,1.05786-0.20551,1.44556-0.58911c0.38745-0.38263,0.60181-0.89349,0.60571-1.46106l-0.00098-8.57263   c-0.09204-1.19147,0.30835-2.54395,0.97681-3.34442c0.72412-0.74225,1.72217-1.14496,2.81641-1.08087   c1.0293-0.06946,2.04712,0.32831,2.74976,1.05981c0.73193,0.87488,1.09302,1.98364,1.01587,3.14771v8.81097   c0,1.12439,0.91504,2.03937,2.03931,2.03937h3.43799V31.75963c0.04199-1.53741-0.28784-3.08362-0.95923-4.47961   c-0.6311-1.22864-1.6106-2.21948-2.83105-2.86438V24.41563z"/>
        <path class="st0" d="M237.79512,19.18938c-0.37207,0.41296-0.58325,0.95996-0.57935,1.49774v20.50433   c-0.00391,0.54413,0.20532,1.05792,0.58911,1.44543c0.38257,0.38751,0.89331,0.60181,1.4502,0.60571h3.43896V18.50774h-3.44092   C238.70601,18.51116,238.18843,18.75286,237.79512,19.18938z"/>
        <path class="st0" d="M251.71968,18.53368h-3.4397c-0.5481,0.00342-1.06079,0.24072-1.44556,0.66888   c-0.36401,0.40466-0.56958,0.94678-0.56665,1.48456v20.50433c-0.00391,0.54413,0.20557,1.05792,0.58911,1.44543   c0.38281,0.38751,0.89355,0.60181,1.45044,0.60571h3.43774C251.74507,43.24259,251.71968,18.53367,251.71968,18.53368z"/>
        <path class="st0" d="M228.15376,25.50676v0.25983c-0.5686-0.57104-1.22803-1.05591-1.9436-1.4278   c-1.17212-0.59937-2.47681-0.8974-3.79004-0.87439c-3.19043-0.06555-6.24268,1.79187-7.66943,4.67828   c-0.80444,1.59167-1.21338,3.37421-1.18311,5.14258c-0.03345,1.78497,0.36792,3.57391,1.16162,5.1734   c0.71631,1.45129,1.82324,2.67114,3.19897,3.52545c1.31055,0.82404,2.81738,1.25848,4.35303,1.25848h0.24463   c1.27515,0,2.54639-0.30432,3.68433-0.88562c0.72241-0.36993,1.38086-0.86017,1.9436-1.44342v0.29553   c0,1.12048,0.91504,2.03253,2.05029,2.03253h3.43774V23.4644h-3.43774C229.07368,23.4644,228.15376,24.38035,228.15376,25.50676z    M227.16475,36.27562c-0.40308,0.7558-1.00317,1.38788-1.72974,1.82477c-0.72974,0.41913-1.56079,0.64099-2.40308,0.64099h-0.00537   c-0.82349,0-1.63062-0.22705-2.33521-0.6582c-0.75488-0.45355-1.37061-1.10443-1.77881-1.87958   c-0.4646-0.89514-0.70142-1.90094-0.68384-2.92505c-0.02393-0.99799,0.21191-1.99023,0.67969-2.86658   c0.41235-0.75214,1.02002-1.38159,1.75269-1.81689c0.73608-0.41864,1.56177-0.62793,2.38745-0.62793   s1.65161,0.20929,2.38745,0.62738c0.75269,0.43005,1.36548,1.06061,1.76953,1.81799   c0.45825,0.89722,0.68799,1.90308,0.66382,2.92505C227.88496,34.35796,227.6418,35.37419,227.16475,36.27562z"/>
        <path class="st0" d="M149.73091,20.4702c0-1.06805-0.76929-1.90472-1.73901-1.90472h-3.36646v5.23816h-0.01831   c-1.41235,0-2.55713,1.14484-2.55713,2.55713v2.58118h2.57544v8.85065c-0.07642,1.67682,0.56665,3.23621,1.55396,4.27911   c0.85132,0.8988,2.01978,1.37341,3.38013,1.37341c1.47363,0,2.61694-0.43219,3.39575-1.28461   c1.20386-1.31818,1.07056-3.14349,1.0647-3.22095l-0.02832-0.34778h-2.49854c-0.58594,0.02466-1.04297-0.12036-1.32886-0.40991   c-0.47266-0.47906-0.44507-1.30536-0.43335-1.65808v-7.58185h1.84814c1.41235,0,2.55713-1.1449,2.55713-2.55713v-2.58118h-4.40527   v-3.33344V20.4702z"/>
        <path class="st0" d="M137.373,14.73643l-6.49268-3.47089c-1.19629-0.63947-2.63281-0.63947-3.8291,0l-6.49292,3.47089   c-1.32129,0.70636-2.14648,2.08307-2.14648,3.58142v6.41565c0,1.49841,0.8252,2.87506,2.14648,3.58142l2.0166,1.07806   l-2.0166,1.078c-1.32129,0.70642-2.14648,2.08307-2.14648,3.58142v6.41565c0,1.49841,0.8252,2.87506,2.14648,3.58142   l6.49292,3.47089c1.19629,0.63947,2.63281,0.63947,3.8291,0l6.49268-3.47089c1.32153-0.70636,2.14648-2.08301,2.14648-3.58142   V34.0524c0-1.49835-0.82495-2.875-2.14648-3.58142l-2.0166-1.078l2.0166-1.07806c1.32153-0.70636,2.14648-2.08301,2.14648-3.58142   v-6.41565C139.51949,16.8195,138.69453,15.44279,137.373,14.73643z M133.87373,38.75199c0,0.69678-0.38379,1.33698-0.99829,1.66547   l-3.01929,1.61407c-0.5564,0.29736-1.22437,0.29736-1.78076,0l-3.01929-1.61407c-0.6145-0.32849-0.99805-0.96869-0.99805-1.66547   v-2.98352c0-0.69678,0.38354-1.33691,0.99805-1.66547l3.01929-1.61407c0.5564-0.29736,1.22437-0.29736,1.78076,0l3.01929,1.61407   c0.6145,0.32855,0.99829,0.96869,0.99829,1.66547V38.75199z M133.87373,23.01743c0,0.69678-0.38379,1.33698-0.99829,1.66547   l-3.01929,1.61407c-0.5564,0.29736-1.22437,0.29736-1.78076,0l-3.01929-1.61407c-0.6145-0.32849-0.99805-0.96869-0.99805-1.66547   v-2.98352c0-0.69678,0.38354-1.33698,0.99805-1.66547l3.01929-1.61407c0.5564-0.29736,1.22437-0.29736,1.78076,0l3.01929,1.61407   c0.6145,0.32849,0.99829,0.96869,0.99829,1.66547V23.01743z"/>
      </g>
      </svg>
`;

const xr8Provider = new XR8Provider();
export { XR8Provider, xr8Provider };