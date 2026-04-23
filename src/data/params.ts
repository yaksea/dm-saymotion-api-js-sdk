export class TimeInterval {
  start: number;
  end: number;

  constructor(start: number = 0.0, end: number = 0.0) {
    this.start = start;
    this.end = end;
  }

  toDict(): Record<string, number> {
    return { start: this.start, end: this.end };
  }
}

export class Text2MotionParams {
  physics_filter?: boolean;
  foot_locking_mode?: string;
  pose_filtering_strength?: number;
  skip_fbx?: number;
  num_variant?: number;
  requested_animation_duration?: number;

  constructor(options?: Partial<Text2MotionParams>) {
    this.physics_filter = options?.physics_filter;
    this.foot_locking_mode = options?.foot_locking_mode;
    this.pose_filtering_strength = options?.pose_filtering_strength;
    this.skip_fbx = options?.skip_fbx;
    this.num_variant = options?.num_variant;
    this.requested_animation_duration = options?.requested_animation_duration;
  }

  protected _appendOptionalParams(params: string[]): void {
    if (this.physics_filter === false) {
      params.push('dis=s');
    }
    if (this.foot_locking_mode) {
      params.push(`footLockingMode=${this.foot_locking_mode}`);
    }
    if (this.pose_filtering_strength !== undefined) {
      params.push(`poseFilteringStrength=${this.pose_filtering_strength}`);
    }
    if (this.skip_fbx !== undefined) {
      params.push(`skipFBX=${this.skip_fbx}`);
    }
    if (this.num_variant !== undefined) {
      params.push(`numVariant=${this.num_variant}`);
    }
    if (this.requested_animation_duration !== undefined) {
      params.push(`requestedAnimationDuration=${this.requested_animation_duration}`);
    }
  }

  toParamsList(prompt: string, model_id: string): string[] {
    const params = [`prompt="${prompt}"`, `model=${model_id}`];
    this._appendOptionalParams(params);
    return params;
  }
}

export class RenderParams {
  variant_id?: number;
  bg_color?: [number, number, number, number];
  backdrop?: string;
  shadow?: number;
  cam_mode?: number;
  cam_horizontal_angle?: number;

  constructor(options?: Partial<RenderParams>) {
    this.variant_id = options?.variant_id;
    this.bg_color = options?.bg_color;
    this.backdrop = options?.backdrop;
    this.shadow = options?.shadow;
    this.cam_mode = options?.cam_mode;
    this.cam_horizontal_angle = options?.cam_horizontal_angle;
  }

  toParamsList(t2m_rid: string): string[] {
    const params = [`t2m_rid=${t2m_rid}`];
    if (this.variant_id !== undefined) {
      params.push(`variant_id=${this.variant_id}`);
    }
    if (this.bg_color) {
      params.push(`bgColor=${this.bg_color[0]},${this.bg_color[1]},${this.bg_color[2]},${this.bg_color[3]}`);
    }
    if (this.backdrop) {
      params.push(`backdrop=${this.backdrop}`);
    }
    if (this.shadow !== undefined) {
      params.push(`shadow=${this.shadow}`);
    }
    if (this.cam_mode !== undefined) {
      params.push(`camMode=${this.cam_mode}`);
    }
    if (this.cam_horizontal_angle !== undefined) {
      params.push(`camHorizontalAngle=${this.cam_horizontal_angle}`);
    }
    return params;
  }
}

export class RerunParams extends Text2MotionParams {
  variant_id?: number;
  rerun: number;

  constructor(options?: Partial<RerunParams>) {
    super(options);
    this.variant_id = options?.variant_id;
    this.rerun = options?.rerun ?? 1;
  }

  toParamsList(t2m_rid: string, model_id: string): string[] {
    const params = [`t2m_rid=${t2m_rid}`, `model=${model_id}`];
    this._appendOptionalParams(params);
    if (this.variant_id !== undefined) {
      params.push(`variant_id=${this.variant_id}`);
    }
    params.push(`rerunRequest={"rerun": ${this.rerun}}`);
    return params;
  }
}

export class InpaintingParams {
  variant_id?: number;

  constructor(options?: Partial<InpaintingParams>) {
    this.variant_id = options?.variant_id;
  }

  toParamsList(t2m_rid: string, prompt: string, intervals: TimeInterval[]): string[] {
    const params = [`t2m_rid=${t2m_rid}`];
    if (this.variant_id !== undefined) {
      params.push(`variant_id=${this.variant_id}`);
    }
    const req = {
      prompt,
      intervals: intervals.map(iv => iv.toDict())
    };
    params.push(`inPaintingRequest=${JSON.stringify(req)}`);
    return params;
  }
}

export class MergingParams {
  variant_id?: number;
  edit_request?: Record<string, number>;
  blend_duration?: number;

  constructor(options?: Partial<MergingParams>) {
    this.variant_id = options?.variant_id;
    this.edit_request = options?.edit_request;
    this.blend_duration = options?.blend_duration;
  }

  toParamsList(t2m_rid: string, prompt: string): string[] {
    const params = [`t2m_rid=${t2m_rid}`];
    if (this.variant_id !== undefined) {
      params.push(`variant_id=${this.variant_id}`);
    }
    const req: Record<string, any> = {
      t2m_rid,
      prompt
    };
    if (this.variant_id !== undefined) {
      req.variant_id = this.variant_id;
    }
    if (this.edit_request) {
      req.editRequest = this.edit_request;
    }
    if (this.blend_duration !== undefined) {
      req.blendDuration = this.blend_duration;
    }
    params.push(`mergingRequest=${JSON.stringify(req)}`);
    return params;
  }
}

export class LoopParams {
  variant_id?: number;
  prompt?: string;
  num_reps: number;
  blend_duration?: number;
  fix_root_mode?: string;
  fix_root_position_altitude?: number;
  fix_root_position_horizontal?: number;
  fix_root_orientation?: number;
  fix_across_entire_motion?: number;

  constructor(options?: Partial<LoopParams>) {
    this.variant_id = options?.variant_id;
    this.prompt = options?.prompt;
    this.num_reps = options?.num_reps ?? 1;
    this.blend_duration = options?.blend_duration;
    this.fix_root_mode = options?.fix_root_mode;
    this.fix_root_position_altitude = options?.fix_root_position_altitude;
    this.fix_root_position_horizontal = options?.fix_root_position_horizontal;
    this.fix_root_orientation = options?.fix_root_orientation;
    this.fix_across_entire_motion = options?.fix_across_entire_motion;
  }

  toParamsList(t2m_rid: string): string[] {
    const params = [`t2m_rid=${t2m_rid}`];
    if (this.variant_id !== undefined) {
      params.push(`variant_id=${this.variant_id}`);
    }
    const req: Record<string, any> = {
      numReps: this.num_reps
    };
    if (this.prompt !== undefined) {
      req.prompt = this.prompt;
    }
    if (this.blend_duration !== undefined) {
      req.blendDuration = this.blend_duration;
    }
    if (this.fix_root_mode) {
      req.fixRootMode = this.fix_root_mode;
    }
    if (this.fix_root_position_altitude !== undefined) {
      req.fixRootPositionAltitude = this.fix_root_position_altitude;
    }
    if (this.fix_root_position_horizontal !== undefined) {
      req.fixRootPositionHorizontal = this.fix_root_position_horizontal;
    }
    if (this.fix_root_orientation !== undefined) {
      req.fixRootOrientation = this.fix_root_orientation;
    }
    if (this.fix_across_entire_motion !== undefined) {
      req.fixAcrossEntireMotion = this.fix_across_entire_motion;
    }
    params.push(`loopRequest=${JSON.stringify(req)}`);
    return params;
  }
}

export class RefineParams {
  variant_id?: number;
  prompt?: string;
  creativity?: number;
  num_variant?: number;

  constructor(options?: Partial<RefineParams>) {
    this.variant_id = options?.variant_id;
    this.prompt = options?.prompt;
    this.creativity = options?.creativity;
    this.num_variant = options?.num_variant;
  }

  toParamsList(t2m_rid: string): string[] {
    const params = [`t2m_rid=${t2m_rid}`];
    if (this.variant_id !== undefined) {
      params.push(`variant_id=${this.variant_id}`);
    }
    const req: Record<string, any> = {};
    if (this.prompt !== undefined) {
      req.prompt = this.prompt;
    }
    if (this.creativity !== undefined) {
      req.creativity = this.creativity;
    }
    if (this.num_variant !== undefined) {
      params.push(`numVariant=${this.num_variant}`);
    }
    params.push(`refineRequest=${JSON.stringify(req)}`);
    return params;
  }
}

// Alias for backward compatibility
export const ProcessParams = Text2MotionParams;
