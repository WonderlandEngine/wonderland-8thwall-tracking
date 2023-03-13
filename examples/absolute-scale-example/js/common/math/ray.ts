/**
 * Helper class for maths regarding 3D Plane
 * Striped down and refactored to use gl-matrix from https://github.com/mrdoob/three.js/blob/dev/src/math/Ray.js
 */
import { vec3 } from 'gl-matrix';
import { Plane } from './plane';

// cached vector to avoid re-creating vectors for gl-matrix function `out` arguments
const _vector = vec3.create();

class Ray {

	public origin: vec3;
	public direction: vec3;

	constructor(origin = vec3.create(), direction = vec3.fromValues(0, 0, -1)) {
		this.origin = origin;
		this.direction = direction;
	}

	set(origin: vec3, direction: vec3) {
		this.origin = vec3.clone(origin);
		this.direction = vec3.clone(direction);
		return this;
	}

	copy(ray: Ray) {

		this.origin = vec3.clone(ray.origin);
		this.direction = vec3.clone(ray.direction);

		return this;
	}


	intersectPlane(plane: Plane, target: vec3) {

		const t = this.distanceToPlane(plane);

		if (t === null) {
			return null;
		}

		return this.at(t, target);
	}


	distanceToPlane(plane: Plane) {

		const denominator = vec3.dot(plane.normal, this.direction);

		if (denominator === 0) {

			// line is coplanar, return origin
			if (plane.distanceToPoint(this.origin) === 0) {

				return 0;

			}

			// Null is preferable to undefined since undefined means.... it is undefined
			return null;
		}

		const t = - (vec3.dot(this.origin, plane.normal) + plane.constant) / denominator;

		// Return if the ray never intersects the plane
		return t >= 0 ? t : null;

	}

	distanceToPoint(point: vec3) {

		return Math.sqrt(this.distanceSqToPoint(point));

	}

	distanceSqToPoint(point: vec3) {
		const directionDistance = vec3.dot(vec3.sub(_vector, point, this.origin), this.direction);

		// point behind the ray
		if (directionDistance < 0) {
			return vec3.sqrDist(this.origin, point);

		}
		const result = vec3.add(_vector, vec3.scale(_vector, vec3.clone(this.direction), directionDistance), this.origin);
		return vec3.sqrDist(result, point);
	}


	at(t: number, target: vec3) {
		return vec3.add(_vector, vec3.scale(_vector, vec3.clone(this.direction), t), this.origin);
	}
}

export { Ray };