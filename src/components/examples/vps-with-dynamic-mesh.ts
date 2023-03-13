import { Component, Mesh, MeshComponent, Material, Object as WLEObject } from '@wonderlandengine/api';

import { ARVPSCamera } from '../AR/cameras/AR-VPS-camera';
// import meshData from './mesh-data.js';

class VPSDynamicMeshExample extends Component {
  public static TypeName = 'vps-dynamic-mesh-example';
  public static Properties = {
    VPSCamera: { type: WL.Type.Object },
    material: { type: WL.Type.Material },
  };

  // injected by WL..
  private VPSCamera!: WLEObject;

  // injected by WL..
  private material!: Material;

  private mesh!: Mesh;
  private meshComp!: MeshComponent;

  start() {
    if (!this.VPSCamera) {
      console.warn(`${this.object.name}/${this.type} requires a ${ARVPSCamera.TypeName}`);
      return;
    }

    const camera = this.VPSCamera.getComponent(ARVPSCamera);

    if (!camera) {
      throw new Error(`${ARVPSCamera.TypeName} was not found on VPSCamera`)
    }

    camera.onWaySpotFound.push(this.updateModelPose)
    camera.onWaySpotUpdated.push(this.updateModelPose)
    camera.onWaySpotLost.push(() => {
      //this.mesh.active = false;
    })

    camera.onMeshFound.push(this.createMesh)
  }

  /**
   * For faster local testing
   */
  private generate2 = async () => {
    const meshData = await (await fetch("/vps-mesh-data.js")).json();

    const meshComp = this.object.addComponent('mesh', {});
    meshComp!.material = this.material;

    const vertexData = new Float32Array(Object.values(meshData.detail.geometry.attributes[0].array));
    const colorData = Object.values(meshData.detail.geometry.attributes[1].array);
    const indexData = new Uint32Array(Object.values(meshData.detail.geometry.index.array));

    const mesh = new WL.Mesh({
      vertexCount: vertexData.length,
      indexData,
      indexType: WL.MeshIndexType.UnsignedInt,
    });


    const positions = mesh.attribute(WL.MeshAttribute.Position);
    const normals = mesh.attribute(WL.MeshAttribute.Normal);
    const colors = mesh.attribute(WL.MeshAttribute.Color);

    let ci = 0;
    for (let i = 0; i < colorData.length; i += 3) {
      colors.set(ci, [colorData[i], colorData[i + 1], colorData[i + 2], 1.0]);
      ci++;
    }

    for (let i = 0; i < vertexData.length; i += 3) {
      positions.set(i / 3, [vertexData[i], vertexData[i + 1], vertexData[i + 2]]);
    }


    meshComp!.mesh = mesh;

    const { position, rotation } = meshData.detail
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

  private createMesh = (meshData: any) => {
    const meshComp = this.object.addComponent('mesh', {});
    meshComp!.material = this.material;

    const vertexData = meshData.detail.geometry.attributes[0].array;
    const colorData = meshData.detail.geometry.attributes[1].array;
    const indexData = meshData.detail.geometry.index.array;


    const mesh = new WL.Mesh({
      vertexCount: vertexData.length,
      indexData,
      indexType: WL.MeshIndexType.UnsignedInt,
    }, this.engine);
    console.log("My mesh", mesh);


    const positions = mesh.attribute(WL.MeshAttribute.Position);
    // const normals = mesh.attribute(WL.MeshAttribute.Normal);
    const colors = mesh.attribute(WL.MeshAttribute.Color);

    let ci = 0;
    for (let i = 0; i < colorData.length; i += 3) {
      colors.set(ci, [colorData[i], colorData[i + 1], colorData[i + 2], 1.0]);
      ci++;
    }

    for (let i = 0; i < vertexData.length; i += 3) {
      positions.set(i / 3, [vertexData[i], vertexData[i + 1], vertexData[i + 2]]);
    }


    meshComp!.mesh = mesh;

    const { position, rotation } = meshData.detail
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

  private updateModelPose = (event: any) => {
    //this.mesh.active = true;
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

WL.registerComponent(VPSDynamicMeshExample);
