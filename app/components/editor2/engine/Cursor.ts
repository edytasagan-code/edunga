export default class Cursor {

  paragraph = 0;

  node = 0;

  offset = 0;

  set(
    paragraph: number,
    node: number,
    offset: number
  ) {
    this.paragraph = paragraph;
    this.node = node;
    this.offset = offset;
  }

  clone() {
    return {
      paragraph: this.paragraph,
      node: this.node,
      offset: this.offset,
    };
  }

}