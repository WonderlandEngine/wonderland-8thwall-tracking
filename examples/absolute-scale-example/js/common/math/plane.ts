/**
 * Helper class for maths regarding 3D Plane
 * Striped down and refactored to use gl-matrix from https://github.com/mrdoob/three.js/blob/dev/src/math/Plane.js
 */

import { vec3 } from 'gl-matrix';


class Plane {
  public readonly isPlane: boolean = true;
  public normal: vec3;
  public constant = 0;

	constructor( normal = vec3.fromValues( 1, 0, 0 ), constant = 0 ) {
		this.normal = normal;
		this.constant = constant;
	}

	set( normal: vec3, constant: number ) {

    this.normal = vec3.clone(normal)
		this.constant = constant;
		return this;
	}

  distanceToPoint( point: vec3 ) {
    return vec3.dot(this.normal, point) + this.constant
	}
}

export { Plane };