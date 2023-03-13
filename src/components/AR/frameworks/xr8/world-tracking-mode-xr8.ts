
import { ViewComponent } from '@wonderlandengine/api';
import { TrackingMode } from '../trackingMode';

import { xr8Provider, XR8ExtraPermissions } from './xr8-provider';
// Just some helper types to determine if an object has some props
type CanDisableSLAM = {
  EnableSLAM: boolean,
}

type CanUseAbsoluteScale = {
  UseAbsoluteScale: boolean
}

type UsesVPS = {
  UsesVPS: boolean
}

class WorldTracking_XR8 extends TrackingMode {
  // consumed by 8thwall
  public readonly name = 'world_tracking_XR8';

  private view?: ViewComponent; // cache camera
  private cachedPosition = [0, 0, 0]; // cache 8thwall cam position
  private cachedRotation = [0, 0, 0, -1]; // cache 8thwall cam rotation

  private extraPermissions: XR8ExtraPermissions = [];

  public readonly onTrackingStatus: Array<(event: XR8TrackingStatusEvent) => void> = [];

  public readonly onImageScanning: Array<(event: XR8ImageScanningEvent) => void> = [];
  public readonly onImageFound: Array<(event: XR8ImageTrackedEvent) => void> = [];
  public readonly onImageUpdate: Array<(event: XR8ImageTrackedEvent) => void> = [];
  public readonly onImageLost: Array<(event: XR8ImageTrackedEvent) => void> = [];

  public readonly onMeshFound: Array<(event: XR8VPSMeshFoundEvent) => void> = [];
  public readonly onWaySpotFound: Array<(event: XR8VPSWayPointEvent) => void> = [];
  public readonly onWaySpotUpdated: Array<(event: XR8VPSWayPointEvent) => void> = [];
  public readonly onWaySpotLost: Array<(event: XR8VPSWayPointEvent) => void> = [];

  // consumed by 8thwall
  public readonly listeners = [
    {
      event: 'reality.trackingstatus', process: (event: XR8TrackingStatusEvent) => {
        this.onTrackingStatus.forEach(callback => callback(event));
      },
    },

    //////////////////////////
    //// VPS Image Events ///
    ////////////////////////

    {
      event: 'reality.imagescanning', process: (event: XR8ImageScanningEvent) => {
        this.onImageScanning.forEach(callback => callback(event));
      }
    },

    {
      event: 'reality.imagefound', process: (event: XR8ImageTrackedEvent) => {
        this.onImageFound.forEach(callback => callback(event));
      }
    },
    {
      event: 'reality.imageupdated', process: (event: XR8ImageTrackedEvent) => {
        this.onImageUpdate.forEach(callback => callback(event));
      }
    },
    {
      event: 'reality.imagelost', process: (event: XR8ImageTrackedEvent) => {
        this.onImageLost.forEach(callback => callback(event));
      }
    },


    //////////////////////////
    /// VPS Mesh Events /////
    ////////////////////////
    {
      event: 'reality.meshfound', process: (event: XR8VPSMeshFoundEvent) => {
        this.onMeshFound.forEach(callback => callback(event));
      }
    },


    // Seems like not implemented by xr8 yet
    {
      event: 'reality.meshupdated', process: (event: XR8VPSMeshUpdatedEvent) => {
        //console.log("Mesh is updated");
      }
    },


    /*
    // Seems like not implemented by xr8 yet
    {
      event: 'reality.meshlost', process: (event: XR8VPSMeshLostEvent) => {
        
      }
    },
    */

    /*
    // TODO - this indicated that xr8 started looking for the feature points
    // However, I feel this is not really informative event since your app logic
    // will naturally expect that the scanning has started.
    {
      event: 'reality.projectwayspotscanning', process: (event: unknown) => {
        
      }
    },*/

    //////////////////////////
    // VPS Waypoint Events //
    ////////////////////////
    {
      event: 'reality.projectwayspotfound', process: (event: XR8VPSWayPointEvent) => {
        this.onWaySpotFound.forEach(callback => callback(event));
      }
    },

    {
      event: 'reality.projectwayspotupdated', process: (event: XR8VPSWayPointEvent) => {
        this.onWaySpotUpdated.forEach(callback => callback(event));
      }
    },

    {
      event: 'reality.projectwayspotlost', process: (event: XR8VPSWayPointEvent) => {
        this.onWaySpotLost.forEach(callback => callback(event));
      }
    },

  ];

  public init(extraPermissions: XR8ExtraPermissions = []) {
    this.extraPermissions = extraPermissions;

    const input = this.component.object.getComponent('input');
    if (input) {
      input.active = false; // 8thwall will handle the camera pose
    }

    this.view = this.component.object.getComponent('view')!;

    const rot = this.component.object.rotationWorld;
    const pos = this.component.object.getTranslationWorld([]);

    this.cachedPosition[0] = pos[0];
    this.cachedPosition[1] = pos[1];
    this.cachedPosition[2] = pos[2];

    this.cachedRotation[0] = rot[0];
    this.cachedRotation[1] = rot[1];
    this.cachedRotation[2] = rot[2];
    this.cachedRotation[3] = rot[3];

    xr8Provider.onSessionEnded.push(() => {
      XR8.removeCameraPipelineModules([
        XR8.XrController.pipelineModule(),
        this,
      ])
    })
  }

  public async startSession() {
    const permissions = await xr8Provider.checkPermissions(this.extraPermissions);
    if (!permissions) {
      return;
    }

    const componentEnablesSLAM = (this.component as Partial<CanDisableSLAM>).EnableSLAM;
    const componentUsesAbsoluteScale = (this.component as Partial<CanUseAbsoluteScale>).UseAbsoluteScale;
    const componentUsesVPS = !!(this.component as Partial<UsesVPS>).UsesVPS;

    XR8.XrController.configure({
      // enableLighting: true,
      disableWorldTracking: componentEnablesSLAM === undefined ? false : !componentEnablesSLAM, // invert componentEnablesSLAM
      scale: componentUsesAbsoluteScale === undefined ? 'responsive' : (componentUsesAbsoluteScale ? 'absolute' : 'responsive'),
      enableVps: componentUsesVPS,
    });

    XR8.addCameraPipelineModules([
      XR8.XrController.pipelineModule(),
      this,
    ]);

    const options = {
      canvas: WL.canvas as HTMLCanvasElement,
      allowedDevices: XR8.XrConfig.device().MOBILE,
      ownRunLoop: false,
      cameraConfig: {
        direction: XR8.XrConfig.camera().BACK
      },
    };
    xr8Provider.startSession(options)
  }

  public endSession() {
    xr8Provider.endSession();
  }

  /**
  * called by 8thwall
  */
  public onAttach = (_params: unknown) => {
    XR8.XrController.updateCameraProjectionMatrix({
      origin: { x: this.cachedPosition[0], y: this.cachedPosition[1], z: this.cachedPosition[2] },
      facing: { x: this.cachedRotation[0], y: this.cachedRotation[1], z: this.cachedRotation[2], w: this.cachedRotation[3] },
      cam: { pixelRectWidth: WL.canvas.width, pixelRectHeight: WL.canvas.height, nearClipPlane: 0.01, farClipPlane: 100 }
    })
  }

  /**
   * called by 8thwall
   */
  public onUpdate = (e: any) => {
    const source = e.processCpuResult.reality;
    if (!source)
      return;

    const { rotation, position, intrinsics } = source;

    this.cachedRotation[0] = rotation.x;
    this.cachedRotation[1] = rotation.y;
    this.cachedRotation[2] = rotation.z;
    this.cachedRotation[3] = rotation.w;

    this.cachedPosition[0] = position.x;
    this.cachedPosition[1] = position.y;
    this.cachedPosition[2] = position.z;

    if (intrinsics) {
      const projectionMatrix = this.view!.projectionMatrix;
      for (let i = 0; i < 16; i++) {
        if (Number.isFinite(intrinsics[i])) { // some processCpuResult.reality.intrinsics are set to Infinity, which WL brakes our projectionMatrix. So we just filter those elements out
          projectionMatrix[i] = intrinsics[i];
        }
      }
    }

    if (position && rotation) {
      this.component.object.rotationWorld = this.cachedRotation;
      this.component.object.setTranslationWorld(this.cachedPosition);
    }
  }
}

export { WorldTracking_XR8 };