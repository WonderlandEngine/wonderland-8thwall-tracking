import { Component, Material, Mesh, Type } from '@wonderlandengine/api';
import { ARSession, ARProvider, WebXRProvider } from '../../../';
class SpawnMeshOnReticle extends Component {

  public static TypeName = 'spawn-mesh-on-reticle';
  public static Properties = {
    /* The mesh to spawn */
    mesh: { type: Type.Mesh },
    /* The material to spawn the mesh with */
    material: { type: Type.Material },
  };

  mesh!: Mesh;
  material!: Material;

  start() {
    ARSession.onSessionStarted.push(this.onSessionStarted);
    ARSession.onSessionEnded.push(this.onSessionEnded);
  }

  onSessionStarted = (provider: ARProvider) => {
    /* We set this function up to get called when a session starts.
     * The 'select' event happens either on touch or when the trigger
     * button of a controller is pressed.
     * Once that event is triggered, we want spawnMesh() to be called. */
    if (provider instanceof WebXRProvider) {
      (provider as WebXRProvider).xrSession!.addEventListener('select', this.spawnMesh);
    } else {
      window.addEventListener('click', this.spawnMesh);
    }
  }

  onSessionEnded = (provider: ARProvider) => {
    if (provider instanceof WebXRProvider) {
      (provider as WebXRProvider).xrSession!.removeEventListener('select', this.spawnMesh);
    } else {
      window.removeEventListener('click', this.spawnMesh);
    }
  }

  spawnMesh = () => {
    /* Create a new object in the scene */
    const o = WL.scene!.addObject(null);
    /* Place new object at current cursor location */
    o.transformLocal = this.object.transformWorld;
    o.scale([0.25, 0.25, 0.25]);
    /* Move out of the floor, at 0.25 scale, the origin of
     * our cube is 0.25 above the floor */
    o.translate([0.0, 0.25, 0.0]);

    /* Add a mesh to render the object */
    const mesh = o.addComponent('mesh', {});
    mesh.material = this.material;
    mesh.mesh = this.mesh;
    mesh.active = true;
  }
}
WL.registerComponent(SpawnMeshOnReticle);