export function cosineSimilarity(
  left: readonly number[],
  right: readonly number[],
): number {
  if (left.length !== right.length || left.length === 0) {
    throw new Error("Cosine similarity requires equal, non-empty vectors.");
  }

  let dotProduct = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < left.length; index += 1) {
    const leftValue = left[index]!;
    const rightValue = right[index]!;
    dotProduct += leftValue * rightValue;
    leftMagnitude += leftValue * leftValue;
    rightMagnitude += rightValue * rightValue;
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) {
    return 0;
  }

  return dotProduct / Math.sqrt(leftMagnitude * rightMagnitude);
}
