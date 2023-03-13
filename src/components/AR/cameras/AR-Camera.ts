import { Component } from '@wonderlandengine/api';

abstract class ARCamera extends Component {
  abstract startSession(): Promise<void>;
  abstract endSession(): Promise<void>;
}

export { ARCamera };