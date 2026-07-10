import type { RefObject } from 'react';
import type { VideoRef } from 'react-native-video';
import { toAvVideoSource } from '../data/hlsUrl';
import type { NativePlayerEvent } from './types';

export type NativePlayerCommandSink = {
  assignSource(url: string): void;
  play(): void;
  pause(): void;
  resume(): void;
  setVolume(level: 0 | 1): void;
};

/**
 * Translates PlaybackEngine commands into react-native-video imperative operations.
 * Phase 1: one adapter for the single owner cell.
 */
export class NativePlayerAdapter implements NativePlayerCommandSink {
  readonly postId: string;
  readonly adapterId: string;

  private readonly videoRef: RefObject<VideoRef | null>;
  private assignedUrl: string | null = null;
  private onEvent: ((event: NativePlayerEvent) => void) | null = null;

  constructor(postId: string, videoRef: RefObject<VideoRef | null>) {
    this.postId = postId;
    this.adapterId = `${postId}-${Math.random().toString(36).slice(2, 9)}`;
    this.videoRef = videoRef;
  }

  bindEventHandler(handler: (event: NativePlayerEvent) => void): void {
    this.onEvent = handler;
  }

  emitNativeEvent(event: Omit<NativePlayerEvent, 'postId'>): void {
    this.onEvent?.({ ...event, postId: this.postId });
  }

  assignSource(url: string): void {
    const trimmed = url.trim();
    if (!trimmed || trimmed === this.assignedUrl) return;
    this.assignedUrl = trimmed;
    const source = toAvVideoSource(trimmed);
    try {
      this.videoRef.current?.setSource?.(source as never);
    } catch {
      // setSource may be unavailable until mount — source prop on Video is fallback
    }
  }

  play(): void {
    try {
      this.videoRef.current?.resume?.();
    } catch {
      /* */
    }
  }

  pause(): void {
    try {
      this.videoRef.current?.pause?.();
    } catch {
      /* */
    }
  }

  resume(): void {
    this.play();
  }

  setVolume(level: 0 | 1): void {
    try {
      this.videoRef.current?.setVolume?.(level);
    } catch {
      /* */
    }
  }

  getAssignedUrl(): string | null {
    return this.assignedUrl;
  }
}
