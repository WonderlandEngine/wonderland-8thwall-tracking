/**
 * Demonstrates handling xr8 events for custom UI overlays/dialogs.
 * In this example we don't display the AR button to start the AR session, but rather start it 
 * as soon as AR is available (ARSession.onARSessionReady).
 * This way we can expect to all UI's to be requested (check iOS for full experience, since Android does not require so many user interactions to start)
 */
import { Component } from "@wonderlandengine/api";
import { ARSession, xr8Provider } from "../../../../";
import { IXR8UIHandler } from '../../../../src/components/AR/frameworks/xr8/ixr8-ui-handler'
import { ARVPSCamera } from '../../../../src/components/AR/cameras/AR-VPS-camera';
import QrCodeWithLogo from 'qrcode-with-logos';

WL.registerComponent(ARVPSCamera);

class CustomUIHandler extends Component implements IXR8UIHandler {
  public static TypeName = "custom-xr8-ui-handler";
  public static Properties = {};

  init() {
    // tell xr8Provider we will be the UI handler
    xr8Provider.uiHandler = this;

    // Start AR session as soon as it's available
    ARSession.onARSessionReady.push(() => {
      this.object.getComponent(ARVPSCamera)?.startSession();
    })
  }

  requestUserInteraction = async () => {
    const html = await (await fetch('xr8-ui/requestPermissionsOverlay.html')).text();
    const overlay = this.showOverlay(html);

    return new Promise<void>((resolve) => {
      const button = document.querySelector<HTMLButtonElement>('#request-permission-overlay-button');
      button?.addEventListener('click', () => {
        overlay.remove();
        resolve();
      });
    })
  };

  async handlePermissionFail(error: Error) {
    console.log("Permission failed", error);
    const html = await (await (await fetch('xr8-ui/failedPermissionsOverlay.html')).text()).replace('${REASON}', error.message);
    this.showOverlay(html);
  };


  handleError = async (error: Event) => {
    console.error("XR8 encountered an error", error);
    const html = await (await (await fetch('xr8-ui/error-overlay.html')).text()).replace('${MESSAGE}', (error as CustomEvent).detail.message);
    this.showOverlay(html);
  };

  showWaitingForDeviceLocation = async () => {
    const html = await (await fetch('xr8-ui/waitingForDeviceLocationOverlay.html')).text();
    this.showOverlay(html);
  };

  hideWaitingForDeviceLocation = () => {
    const overlay = document.querySelector("#waiting-for-device-location-overlay");
    if (overlay) {
        overlay.remove();
    }
  };

  handleIncompatibleDevice = async () => {
    const html = await (await fetch('xr8-ui/incompatibleDeviceOverlay.html')).text();
    const overlay = this.showOverlay(html);
   

    const f = new QrCodeWithLogo({
      //canvas: document.getElementById("canvas"),
      content: document.location.href,
      width: 350,
      //download: true,
      image: overlay.querySelector("#xr8-overlay-qr-code") as HTMLImageElement,
      logo: {
        src: "ball.png"
      }
    }).toImage()
    overlay.querySelector('#xr8-overlay-epxerience-url')!.innerHTML = document.location.href;
  };

  showOverlay = (htmlContent: string) => {
    const previousOverlay = document.querySelector('.xr8-overlay');
    if(previousOverlay) {
      previousOverlay.remove();
    }

    const overlay = document.createElement('div');
    overlay.innerHTML = htmlContent;
    document.body.appendChild(overlay);
    return overlay;
  }
}

WL.registerComponent(CustomUIHandler)