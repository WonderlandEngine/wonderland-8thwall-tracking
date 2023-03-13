import { Component, Mesh, MeshComponent, Material, Object as WLEObject, Type, MeshIndexType, MeshAttribute } from '@wonderlandengine/api';
import { ARSession } from '../../../';
import { ARVPSCamera } from '../../../src/components/AR/cameras/AR-VPS-camera';

class VPSMeshExample extends Component {
  public static TypeName = 'vps-mesh-example';
  public static Properties = {
    VPSCamera: { type: Type.Object },
    generatedMeshMaterial: { type: Type.Material }, // MAterial to use for the generated mesh
  };

  // injected by WL..
  private VPSCamera!: WLEObject;

  // injected by WL..
  private generatedMeshMaterial!: Material;


  private mesh: Mesh | null = null;
  private meshComp: MeshComponent | null = null;

  private toggleMeshButton!: HTMLButtonElement;

  start() {
    if (!this.VPSCamera) {
      console.warn(`${this.object.name}/${this.type} requires a ${ARVPSCamera}`);
      return;
    }

    const camera = this.VPSCamera.getComponent(ARVPSCamera);

    if (!camera) {
      throw new Error(`${ARVPSCamera.TypeName} was not found on VPSCamera`)
    }


    this.toggleMeshButton = document.createElement('button');
    this.toggleMeshButton.innerHTML = 'Toggle Mesh';
    this.toggleMeshButton.id = 'toggle-vps-mesh-button';
    this.toggleMeshButton.style.lineHeight = '40px';
    this.toggleMeshButton.style.position = 'absolute';
    this.toggleMeshButton.style.top = '0';
    this.toggleMeshButton.style.right = '0';

    this.toggleMeshButton.addEventListener('click', () => {
      if (this.meshComp) {
        this.meshComp.active = !this.meshComp.active;
      }
    });

    ARSession.onSessionStarted.push(() => {
      document.body.appendChild(this.toggleMeshButton);
    });

    ARSession.onSessionEnded.push(() => {
      this.toggleMeshButton.remove();

      if (this.meshComp) {
        this.meshComp.destroy();
        this.mesh!.destroy();

        this.meshComp = null;
        this.mesh = null;
      }
    })

    camera.onMeshFound.push(this.createMesh)
  }

  /**
   * Just a heads up, 8thwall sends only one mesh to the client
   * and it seems like at that the mesh is not connected to the waypoint in any way.
   */
  private createMesh = (event: XR8VPSMeshFoundEvent) => {
    // #vps-example-debug-text should be created by the ./vps-example.ts
    const debugText = document.querySelector('#vps-example-debug-text');
    if (debugText) {
      debugText.innerHTML += "<br />Mesh received: " + event.detail.id;
    }

    this.meshComp = this.object.addComponent('mesh', {})!;
    this.meshComp.material = this.generatedMeshMaterial;

    const vertexData = event.detail.geometry.attributes[0].array;
    const colorData = event.detail.geometry.attributes[1].array;
    const indexData = event.detail.geometry.index.array;

    this.mesh = new Mesh(this.engine, {
      vertexCount: vertexData.length,
      indexData,
      indexType: MeshIndexType.UnsignedInt,
    });


    const positions = this.mesh.attribute(MeshAttribute.Position)!;
    // const normals = mesh.attribute(WL.MeshAttribute.Normal);
    const colors = this.mesh.attribute(MeshAttribute.Color)!;

    let ci = 0;
    for (let i = 0; i < colorData.length; i += 3) {
      colors.set(ci, [colorData[i], colorData[i + 1], colorData[i + 2], 1.0]);
      ci++;
    }

    for (let i = 0; i < vertexData.length; i += 3) {
      positions.set(i / 3, [vertexData[i], vertexData[i + 1], vertexData[i + 2]]);
    }

    this.meshComp.mesh = this.mesh;

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

WL.registerComponent(VPSMeshExample);
