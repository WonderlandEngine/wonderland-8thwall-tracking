
import { ViewComponent } from '@wonderlandengine/api';
import { TrackingMode } from '../trackingMode';
import { xr8Provider } from './xr8-provider';
import { ARFaceTrackingCamera } from '../../cameras/AR-face-tracking-camera';


class FaceTracking_XR8 extends TrackingMode {
  public readonly name = 'face_tracking_XR8';

  private view?: ViewComponent;  // cache camera
  private cachedPosition = [0, 0, 0]; // cache 8thwall cam position
  private cachedRotation = [0, 0, 0, -1]; // cache 8thwall cam rotation

  public readonly onFaceScanning: Array<(event: XR8FaceLoadingEvent) => void> = [];
  public readonly onFaceLoading: Array<(event: XR8FaceLoadingEvent) => void> = [];
  public readonly onFaceFound: Array<(event: XR8FaceFoundEvent) => void> = [];
  public readonly onFaceUpdate: Array<(event: XR8FaceFoundEvent) => void> = [];
  public readonly onFaceLost: Array<(event: xr8FaceLostEvent) => void> = [];

  // consumed by 8thwall
  public readonly listeners = [
    {
      // Fires when loading begins for additional face AR resources.
      event: 'facecontroller.faceloading', process: (event: XR8FaceLoadingEvent) => { 
        this.onFaceLoading.forEach(callback => callback(event));
      }
    },

    {
      // Fires when all face AR resources have been loaded and scanning has begun.
      event: 'facecontroller.facescanning', process: (event: XR8FaceLoadingEvent) => {
        this.onFaceLoading.forEach(callback => callback(event));
      }
    },

    {
      event: 'facecontroller.facefound', process: (event: XR8FaceFoundEvent) => {
        this.onFaceFound.forEach(callback => callback(event));
      }
    },
    {
      event: 'facecontroller.faceupdated', process: (event: XR8FaceFoundEvent) => {
        this.onFaceUpdate.forEach(callback => callback(event));
      }
    },
    {
      event: 'facecontroller.facelost', process: (event: xr8FaceLostEvent) => {
        this.onFaceLost.forEach(callback => callback(event));
      }
    },
  ];

  public init() {
    
    const input = this.component.object.getComponent('input');
    if (input) {
      input.active = false; // 8thwall will handle the camera pose
    }

    this.view = this.component.object.getComponent('view')!;

    xr8Provider.onSessionEnded.push(() => {
      XR8.removeCameraPipelineModules([
        XR8.FaceController.pipelineModule(),
        this,
      ])
    })
  }

  public async startSession() {
    const permissions = await xr8Provider.checkPermissions();

    if (!permissions) {
      return;
    }

    XR8.FaceController.configure({
      meshGeometry: [
        XR8.FaceController.MeshGeometry.FACE,
        XR8.FaceController.MeshGeometry.EYES,
        XR8.FaceController.MeshGeometry.MOUTH,
      ],
      coordinates: { mirroredDisplay: false },
    })

    XR8.addCameraPipelineModules([
      XR8.FaceController.pipelineModule(),
      this,
    ]);

    const options = {
      canvas: WL.canvas as HTMLCanvasElement,
      allowedDevices: XR8.XrConfig.device().ANY,
      ownRunLoop: false,
      cameraConfig: {
        direction: (ARFaceTrackingCamera.Properties.cameraDirection.values[(this.component as ARFaceTrackingCamera).cameraDirection]),
      },
    };

    xr8Provider.startSession(options);
  }

  public endSession() {
    xr8Provider.endSession();
  }

  /**
   * @param {*} e 
   * 
   * called by 8thwall
   */
  public onUpdate = (e: any) => {
    const source = e.processCpuResult.facecontroller;

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

export { FaceTracking_XR8 }