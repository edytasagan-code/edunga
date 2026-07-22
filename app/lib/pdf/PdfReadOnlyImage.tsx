import { Image, StyleSheet } from "@react-pdf/renderer";

import type { ImageNode } from "@/app/components/editor/types";

const styles = StyleSheet.create({
  image: {
    marginVertical: 4,
  },
  imageLeft: {
    alignSelf: "flex-start",
  },
  imageCenter: {
    alignSelf: "center",
  },
  imageRight: {
    alignSelf: "flex-end",
  },
});

type Props = {
  node: ImageNode;
  contentScale?: number;
};

export function PdfReadOnlyImage({
  node,
  contentScale = 1,
}: Props) {
  const alignStyle =
    node.align === "center"
      ? styles.imageCenter
      : node.align === "right"
        ? styles.imageRight
        : styles.imageLeft;

  return (
    <Image
      src={node.src}
      style={{
        ...styles.image,
        ...alignStyle,
        width: node.width * contentScale,
        height: node.height * contentScale,
      }}
    />
  );
}
