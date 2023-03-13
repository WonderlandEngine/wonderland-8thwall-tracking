import { Component } from '@wonderlandengine/api';
import { ARSession, ARCamera } from '../../';

class ButtonStartARSession extends Component {

  public static TypeName = 'button-start-ar-session';
  public static Properties = {

  };

  init() {

    if (ARSession.arSessionReady) {
      this.onARSessionReady();
    } else {
      ARSession.onARSessionReady.push(() => this.onARSessionReady());
    }


    ARSession.onSessionEnded.push(() => {
      let xrButton = document.querySelector<HTMLElement>('#ar-button');
      xrButton!.style.display = 'block';
    })
  }

  onARSessionReady() {
    let xrButton = document.querySelector<HTMLElement>('#ar-button');

    if (xrButton === null) {
      console.error('No #ar-button found. Session will not start.');
      return;
    }

    xrButton.style.display = 'block';

    xrButton.addEventListener('click', () => {
      // console.log("ARDCamera", this.ARCamera);
      xrButton!.style.display = 'none';
      const components = this.object.getComponents();
      for (let i = 0; i < components.length; i++) {
        if (components[i] instanceof ARCamera) {
          // Seems like typescript looses the context of `if (components[i] instanceof ARCamera)`
          // and complains that `(components[i] as ARCamera)` does not overlap. 
          // So let's do ask it asks - convert the component to unknown first and only then to ARCamera
          ((components[i] as unknown) as ARCamera).startSession();
          break;
        }
      }
    });
  }
}

WL.registerComponent(ButtonStartARSession);