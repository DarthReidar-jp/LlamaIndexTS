import _ from "lodash";
import type { ImageType } from "../Node.js";
import { MultiModalEmbedding } from "./MultiModalEmbedding.js";

async function readImage(input: ImageType) {
  const { RawImage } = await import(
    /* webpackIgnore: true */
    "@xenova/transformers"
  );
  if (input instanceof Blob) {
    return await RawImage.fromBlob(input);
  } else if (_.isString(input) || input instanceof URL) {
    return await RawImage.fromURL(input);
  } else {
    throw new Error(`Unsupported input type: ${typeof input}`);
  }
}

export enum ClipEmbeddingModelType {
  XENOVA_CLIP_VIT_BASE_PATCH32 = "Xenova/clip-vit-base-patch32",
  XENOVA_CLIP_VIT_BASE_PATCH16 = "Xenova/clip-vit-base-patch16",
}

export class ClipEmbedding extends MultiModalEmbedding {
  modelType: ClipEmbeddingModelType =
    ClipEmbeddingModelType.XENOVA_CLIP_VIT_BASE_PATCH16;

  private tokenizer: any;
  private processor: any;
  private visionModel: any;
  private textModel: any;

  async getTokenizer() {
    if (!this.tokenizer) {
      const { AutoTokenizer } = await import(
        /* webpackIgnore: true */
        "@xenova/transformers"
      );
      this.tokenizer = await AutoTokenizer.from_pretrained(this.modelType);
    }
    return this.tokenizer;
  }

  async getProcessor() {
    if (!this.processor) {
      const { AutoProcessor } = await import(
        /* webpackIgnore: true */
        "@xenova/transformers"
      );
      this.processor = await AutoProcessor.from_pretrained(this.modelType);
    }
    return this.processor;
  }

  async getVisionModel() {
    if (!this.visionModel) {
      const { CLIPVisionModelWithProjection } = await import(
        /* webpackIgnore: true */
        "@xenova/transformers"
      );
      this.visionModel = await CLIPVisionModelWithProjection.from_pretrained(
        this.modelType,
      );
    }

    return this.visionModel;
  }

  async getTextModel() {
    if (!this.textModel) {
      const { CLIPTextModelWithProjection } = await import(
        /* webpackIgnore: true */
        "@xenova/transformers"
      );
      this.textModel = await CLIPTextModelWithProjection.from_pretrained(
        this.modelType,
      );
    }

    return this.textModel;
  }

  async getImageEmbedding(image: ImageType): Promise<number[]> {
    const loadedImage = await readImage(image);
    const imageInputs = await (await this.getProcessor())(loadedImage);
    const { image_embeds } = await (await this.getVisionModel())(imageInputs);
    return Array.from(image_embeds.data);
  }

  async getTextEmbedding(text: string): Promise<number[]> {
    const textInputs = await (
      await this.getTokenizer()
    )([text], { padding: true, truncation: true });
    const { text_embeds } = await (await this.getTextModel())(textInputs);
    return text_embeds.data;
  }

  async getQueryEmbedding(query: string): Promise<number[]> {
    return this.getTextEmbedding(query);
  }
}
