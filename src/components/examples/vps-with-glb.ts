import { Component, Mesh, MeshComponent, Object as WLEObject } from '@wonderlandengine/api';

import { ARVPSCamera } from '../AR/cameras/AR-VPS-camera';
// import meshData from './mesh-data.js';

class VPSGLBExample extends Component {
  public static TypeName = 'vps-glb-example';
  public static Properties = {
    VPSCamera: { type: WL.Type.Object },
  };

  // injected by WL..
  private VPSCamera!: WLEObject;

  private mesh!: MeshComponent;

  start() {
    if (!this.VPSCamera) {
      console.warn(`${this.object.name}/${this.type} requires a ${ARVPSCamera.TypeName}`);
      return;
    }

    const camera = this.VPSCamera.getComponent(ARVPSCamera);

    if (!camera) {
      throw new Error(`${ARVPSCamera.TypeName} was not found on VPSCamera`)
    }
    this.mesh = this.object.getComponent("mesh")!;
    this.mesh.active = false;

    camera.onWaySpotFound.push(this.updateModelPose)
    camera.onWaySpotUpdated.push(this.updateModelPose)

    camera.onWaySpotLost.push(() => {
      this.mesh.active = false;
    })

    camera.onMeshFound.push(this.createMesh)
  }

  private createMesh = (data: unknown) => {
    console.log("Create mesh", data);
  }

  private updateModelPose = (event: any) => {
    console.log("Updating mode");
    this.mesh.active = true;
    const { position, rotation } = event.detail
    const cachedPosition = [];
    const cachedRotation = [];

    cachedRotation[0] = rotation.x;
    cachedRotation[1] = rotation.y;
    cachedRotation[2] = rotation.z;
    cachedRotation[3] = rotation.w;

    cachedPosition[0] = position.x;
    cachedPosition[1] = position.y;
    cachedPosition[2] = position.z;

    this.object.rotationWorld.set(cachedRotation);
    this.object.setTranslationWorld(cachedPosition);
  }
}

WL.registerComponent(VPSGLBExample);
