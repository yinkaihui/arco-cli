import { VFile } from 'vfile';
import { ImportSpecifier } from './importSpecifier';

export class CompileOutput {
  constructor(readonly file: VFile, private _renderer: string) {}

  get renderer() {
    return this._renderer;
  }

  changeRenderer(renderer: string) {
    this._renderer = renderer;
  }

  /**
   * get the mdx file metadata.
   */
  getMetadata() {
    return (this.file.data as any).frontmatter;
  }

  /**
   * get headings of markdown.
   */
  getOutline() {
    return (this.file.data as any).headings;
  }

  /**
   * get all import specifiers.
   */
  getImportSpecifiers(): ImportSpecifier[] {
    const data: any = this.file.data;
    return data.imports;
  }

  /**
   * get the mdx file contents. including the renderer.
   */
  get contents() {
    return `${this.renderer}\n${this.file.contents}`;
  }
}
