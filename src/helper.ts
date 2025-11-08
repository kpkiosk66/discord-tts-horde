export function cleanEmojiString(input: string) {
  // Use a regular expression to match the pattern <:...:> and replace it with a space
  return input.replace(/<:([^:>]+):\d+>/g, " $1 ").trim();
}

export function cleanOutsideEmojiString(input: string) {
  // Use a regular expression to match the pattern <:...:> and replace it with a space
  const match = input.match(/<[^:]+:([^:]+):[^>]+>/);
  return match ? match[1] : "";
}

export function hasMultipleFives(inputString: string) {
  // Split the string into an array of characters
  const characters = inputString.split("");

  // Filter the array to only keep the character '5'
  const fives = characters.filter((char) => char === "5");

  // Check if there are more than one '5' in the string
  return fives.length;
}

export function replaceConsecutiveFives(input: string) {
  return input.replace(/5+/g, function (match) {
    return "ฮ่า".repeat(match.length);
  });
}

export function markdownToPlainText(markdownString: string) {
    let plainText = markdownString;

    // Remove headers
    plainText = plainText.replace(/^#{1,6} /gm, "");

    // Remove italics and bold
    plainText = plainText.replace(/(\*|_){1,2}([^*]+)(\*|_){1,2}/gm, "$2");

    // Remove links and images
    plainText = plainText.replace(/\[([^\]]+)\]\(([^)]+)\)/gm, "$1"); // Links
    plainText = plainText.replace(/!\[([^\]]+)\]\(([^)]+)\)/gm, "$1"); // Images

    // Remove horizontal rules
    plainText = plainText.replace(/^-{3,}/gm, "");

    // Remove lists
    plainText = plainText.replace(/^[*-]\s+/gm, "");
    plainText = plainText.replace(/^[0-9]+\.\s+/gm, "");

    // Remove code blocks and inline code
    plainText = plainText.replace(/(```[\s\S]*?```|`[^`]+`)/g, "");

    return plainText.trim();
  }