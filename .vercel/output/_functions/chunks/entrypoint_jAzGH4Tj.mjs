import '@vercel/routing-utils';
import nodePath from 'node:path';
import colors from 'piccolore';
import { parse, stringify as stringify$1, unflatten as unflatten$1 } from 'devalue';
import 'es-module-lexer';
import { serialize, parse as parse$1 } from 'cookie';
import { escape } from 'html-escaper';
import { clsx } from 'clsx';
import { encodeBase64, encodeHexUpperCase, decodeBase64, decodeHex } from '@oslojs/encoding';
import * as z from 'zod/v4';
import { createStorage } from 'unstorage';

function normalizeLF(code) {
  return code.replace(/\r\n|\r(?!\n)|\n/g, "\n");
}

function codeFrame(src, loc) {
  if (!loc || loc.line === void 0 || loc.column === void 0) {
    return "";
  }
  const lines = normalizeLF(src).split("\n").map((ln) => ln.replace(/\t/g, "  "));
  const visibleLines = [];
  for (let n = -2; n <= 2; n++) {
    if (lines[loc.line + n]) visibleLines.push(loc.line + n);
  }
  let gutterWidth = 0;
  for (const lineNo of visibleLines) {
    let w = `> ${lineNo}`;
    if (w.length > gutterWidth) gutterWidth = w.length;
  }
  let output = "";
  for (const lineNo of visibleLines) {
    const isFocusedLine = lineNo === loc.line - 1;
    output += isFocusedLine ? "> " : "  ";
    output += `${lineNo + 1} | ${lines[lineNo]}
`;
    if (isFocusedLine)
      output += `${Array.from({ length: gutterWidth }).join(" ")}  | ${Array.from({
        length: loc.column
      }).join(" ")}^
`;
  }
  return output;
}

class AstroError extends Error {
  loc;
  title;
  hint;
  frame;
  type = "AstroError";
  constructor(props, options) {
    const { name, title, message, stack, location, hint, frame } = props;
    super(message, options);
    this.title = title;
    this.name = name;
    if (message) this.message = message;
    this.stack = stack ? stack : this.stack;
    this.loc = location;
    this.hint = hint;
    this.frame = frame;
  }
  setLocation(location) {
    this.loc = location;
  }
  setName(name) {
    this.name = name;
  }
  setMessage(message) {
    this.message = message;
  }
  setHint(hint) {
    this.hint = hint;
  }
  setFrame(source, location) {
    this.frame = codeFrame(source, location);
  }
  static is(err) {
    return err?.type === "AstroError";
  }
}
class AstroUserError extends Error {
  type = "AstroUserError";
  /**
   * A message that explains to the user how they can fix the error.
   */
  hint;
  name = "AstroUserError";
  constructor(message, hint) {
    super();
    this.message = message;
    this.hint = hint;
  }
  static is(err) {
    return err?.type === "AstroUserError";
  }
}

const ClientAddressNotAvailable = {
  name: "ClientAddressNotAvailable",
  title: "`Astro.clientAddress` is not available in current adapter.",
  message: (adapterName) => `\`Astro.clientAddress\` is not available in the \`${adapterName}\` adapter. File an issue with the adapter to add support.`
};
const PrerenderClientAddressNotAvailable = {
  name: "PrerenderClientAddressNotAvailable",
  title: "`Astro.clientAddress` cannot be used inside prerendered routes.",
  message: (name) => `\`Astro.clientAddress\` cannot be used inside prerendered route ${name}`
};
const StaticClientAddressNotAvailable = {
  name: "StaticClientAddressNotAvailable",
  title: "`Astro.clientAddress` is not available in prerendered pages.",
  message: "`Astro.clientAddress` is only available on pages that are server-rendered.",
  hint: "See https://docs.astro.build/en/guides/on-demand-rendering/ for more information on how to enable SSR."
};
const NoMatchingStaticPathFound = {
  name: "NoMatchingStaticPathFound",
  title: "No static path found for requested path.",
  message: (pathName) => `A \`getStaticPaths()\` route pattern was matched, but no matching static path was found for requested path \`${pathName}\`.`,
  hint: (possibleRoutes) => `Possible dynamic routes being matched: ${possibleRoutes.join(", ")}.`
};
const OnlyResponseCanBeReturned = {
  name: "OnlyResponseCanBeReturned",
  title: "Invalid type returned by Astro page.",
  message: (route, returnedValue) => `Route \`${route ? route : ""}\` returned a \`${returnedValue}\`. Only a [Response](https://developer.mozilla.org/en-US/docs/Web/API/Response) can be returned from Astro files.`,
  hint: "See https://docs.astro.build/en/guides/on-demand-rendering/#response for more information."
};
const MissingMediaQueryDirective = {
  name: "MissingMediaQueryDirective",
  title: "Missing value for `client:media` directive.",
  message: 'Media query not provided for `client:media` directive. A media query similar to `client:media="(max-width: 600px)"` must be provided'
};
const NoMatchingRenderer = {
  name: "NoMatchingRenderer",
  title: "No matching renderer found.",
  message: (componentName, componentExtension, plural, validRenderersCount) => `Unable to render \`${componentName}\`.

${validRenderersCount > 0 ? `There ${plural ? "are" : "is"} ${validRenderersCount} renderer${plural ? "s" : ""} configured in your \`astro.config.mjs\` file,
but ${plural ? "none were" : "it was not"} able to server-side render \`${componentName}\`.` : `No valid renderer was found ${componentExtension ? `for the \`.${componentExtension}\` file extension.` : `for this file extension.`}`}`,
  hint: (probableRenderers) => `Did you mean to enable the ${probableRenderers} integration?

See https://docs.astro.build/en/guides/framework-components/ for more information on how to install and configure integrations.`
};
const NoClientOnlyHint = {
  name: "NoClientOnlyHint",
  title: "Missing hint on client:only directive.",
  message: (componentName) => `Unable to render \`${componentName}\`. When using the \`client:only\` hydration strategy, Astro needs a hint to use the correct renderer.`,
  hint: (probableRenderers) => `Did you mean to pass \`client:only="${probableRenderers}"\`? See https://docs.astro.build/en/reference/directives-reference/#clientonly for more information on client:only`
};
const InvalidGetStaticPathsEntry = {
  name: "InvalidGetStaticPathsEntry",
  title: "Invalid entry inside getStaticPath's return value",
  message: (entryType) => `Invalid entry returned by getStaticPaths. Expected an object, got \`${entryType}\``,
  hint: "If you're using a `.map` call, you might be looking for `.flatMap()` instead. See https://docs.astro.build/en/reference/routing-reference/#getstaticpaths for more information on getStaticPaths."
};
const InvalidGetStaticPathsReturn = {
  name: "InvalidGetStaticPathsReturn",
  title: "Invalid value returned by getStaticPaths.",
  message: (returnType) => `Invalid type returned by \`getStaticPaths\`. Expected an \`array\`, got \`${returnType}\``,
  hint: "See https://docs.astro.build/en/reference/routing-reference/#getstaticpaths for more information on getStaticPaths."
};
const GetStaticPathsExpectedParams = {
  name: "GetStaticPathsExpectedParams",
  title: "Missing params property on `getStaticPaths` route.",
  message: "Missing or empty required `params` property on `getStaticPaths` route.",
  hint: "See https://docs.astro.build/en/reference/routing-reference/#getstaticpaths for more information on getStaticPaths."
};
const GetStaticPathsInvalidRouteParam = {
  name: "GetStaticPathsInvalidRouteParam",
  title: "Invalid route parameter returned by `getStaticPaths()`.",
  message: (key, value, valueType) => `Invalid \`getStaticPaths()\` route parameter for \`${key}\`. Expected a string or undefined, received \`${valueType}\` (\`${value}\`)`,
  hint: "See https://docs.astro.build/en/reference/routing-reference/#getstaticpaths for more information on getStaticPaths."
};
const GetStaticPathsRequired = {
  name: "GetStaticPathsRequired",
  title: "`getStaticPaths()` function required for dynamic routes.",
  message: "`getStaticPaths()` function is required for dynamic routes. Make sure that you `export` a `getStaticPaths` function from your dynamic route.",
  hint: `See https://docs.astro.build/en/guides/routing/#dynamic-routes for more information on dynamic routes.

	If you meant for this route to be server-rendered, set \`export const prerender = false;\` in the page.`
};
const ReservedSlotName = {
  name: "ReservedSlotName",
  title: "Invalid slot name.",
  message: (slotName) => `Unable to create a slot named \`${slotName}\`. \`${slotName}\` is a reserved slot name. Please update the name of this slot.`
};
const NoMatchingImport = {
  name: "NoMatchingImport",
  title: "No import found for component.",
  message: (componentName) => `Could not render \`${componentName}\`. No matching import has been found for \`${componentName}\`.`,
  hint: "Please make sure the component is properly imported."
};
const InvalidComponentArgs = {
  name: "InvalidComponentArgs",
  title: "Invalid component arguments.",
  message: (name) => `Invalid arguments passed to${name ? ` <${name}>` : ""} component.`,
  hint: "Astro components cannot be rendered directly via function call, such as `Component()` or `{items.map(Component)}`."
};
const PageNumberParamNotFound = {
  name: "PageNumberParamNotFound",
  title: "Page number param not found.",
  message: (paramName) => `[paginate()] page number param \`${paramName}\` not found in your filepath.`,
  hint: "Rename your file to `[page].astro` or `[...page].astro`."
};
const ImageMissingAlt = {
  name: "ImageMissingAlt",
  title: 'Image missing required "alt" property.',
  message: 'Image missing "alt" property. "alt" text is required to describe important images on the page.',
  hint: 'Use an empty string ("") for decorative images.'
};
const InvalidImageService = {
  name: "InvalidImageService",
  title: "Error while loading image service.",
  message: "There was an error loading the configured image service. Please see the stack trace for more information."
};
const MissingImageDimension = {
  name: "MissingImageDimension",
  title: "Missing image dimensions",
  message: (missingDimension, imageURL) => `Missing ${missingDimension === "both" ? "width and height attributes" : `${missingDimension} attribute`} for ${imageURL}. When using remote images, both dimensions are required in order to avoid CLS.`,
  hint: "If your image is inside your `src` folder, you probably meant to import it instead. See [the Imports guide for more information](https://docs.astro.build/en/guides/imports/#other-assets). You can also use `inferSize={true}` for remote images to get the original dimensions."
};
const FailedToFetchRemoteImageDimensions = {
  name: "FailedToFetchRemoteImageDimensions",
  title: "Failed to retrieve remote image dimensions",
  message: (imageURL) => `Failed to get the dimensions for ${imageURL}.`,
  hint: "Verify your remote image URL is accurate, and that you are not using `inferSize` with a file located in your `public/` folder."
};
const RemoteImageNotAllowed = {
  name: "RemoteImageNotAllowed",
  title: "Remote image is not allowed",
  message: (imageURL) => `Remote image ${imageURL} is not allowed by your image configuration.`,
  hint: "Update `image.domains` or `image.remotePatterns`, or remove `inferSize` for this image."
};
const UnsupportedImageFormat = {
  name: "UnsupportedImageFormat",
  title: "Unsupported image format",
  message: (format, imagePath, supportedFormats) => `Received unsupported format \`${format}\` from \`${imagePath}\`. Currently only ${supportedFormats.join(
    ", "
  )} are supported by our image services.`,
  hint: "Using an `img` tag directly instead of the `Image` component might be what you're looking for."
};
const UnsupportedImageConversion = {
  name: "UnsupportedImageConversion",
  title: "Unsupported image conversion",
  message: "Converting between vector (such as SVGs) and raster (such as PNGs and JPEGs) images is not currently supported."
};
const PrerenderDynamicEndpointPathCollide = {
  name: "PrerenderDynamicEndpointPathCollide",
  title: "Prerendered dynamic endpoint has path collision.",
  message: (pathname) => `Could not render \`${pathname}\` with an \`undefined\` param as the generated path will collide during prerendering. Prevent passing \`undefined\` as \`params\` for the endpoint's \`getStaticPaths()\` function, or add an additional extension to the endpoint's filename.`,
  hint: (filename) => `Rename \`${filename}\` to \`${filename.replace(/\.(?:js|ts)/, (m) => `.json` + m)}\``
};
const ExpectedImage = {
  name: "ExpectedImage",
  title: "Expected src to be an image.",
  message: (src, typeofOptions, fullOptions) => `Expected \`src\` property for \`getImage\` or \`<Image />\` to be either an ESM imported image or a string with the path of a remote image. Received \`${src}\` (type: \`${typeofOptions}\`).

Full serialized options received: \`${fullOptions}\`.`,
  hint: "This error can often happen because of a wrong path. Make sure the path to your image is correct. If you're passing an async function, make sure to call and await it."
};
const ExpectedImageOptions = {
  name: "ExpectedImageOptions",
  title: "Expected image options.",
  message: (options) => `Expected getImage() parameter to be an object. Received \`${options}\`.`
};
const ExpectedNotESMImage = {
  name: "ExpectedNotESMImage",
  title: "Expected image options, not an ESM-imported image.",
  message: "An ESM-imported image cannot be passed directly to `getImage()`. Instead, pass an object with the image in the `src` property.",
  hint: "Try changing `getImage(myImage)` to `getImage({ src: myImage })`"
};
const IncompatibleDescriptorOptions = {
  name: "IncompatibleDescriptorOptions",
  title: "Cannot set both `densities` and `widths`",
  message: "Only one of `densities` or `widths` can be specified. In most cases, you'll probably want to use only `widths` if you require specific widths.",
  hint: "Those attributes are used to construct a `srcset` attribute, which cannot have both `x` and `w` descriptors."
};
const NoImageMetadata = {
  name: "NoImageMetadata",
  title: "Could not process image metadata.",
  message: (imagePath) => `Could not process image metadata${imagePath ? ` for \`${imagePath}\`` : ""}.`,
  hint: "This is often caused by a corrupted or malformed image. Re-exporting the image from your image editor may fix this issue."
};
const ResponseSentError = {
  name: "ResponseSentError",
  title: "Unable to set response.",
  message: "The response has already been sent to the browser and cannot be altered."
};
const MiddlewareNoDataOrNextCalled = {
  name: "MiddlewareNoDataOrNextCalled",
  title: "The middleware didn't return a `Response`.",
  message: "Make sure your middleware returns a `Response` object, either directly or by returning the `Response` from calling the `next` function."
};
const MiddlewareNotAResponse = {
  name: "MiddlewareNotAResponse",
  title: "The middleware returned something that is not a `Response` object.",
  message: "Any data returned from middleware must be a valid `Response` object."
};
const EndpointDidNotReturnAResponse = {
  name: "EndpointDidNotReturnAResponse",
  title: "The endpoint did not return a `Response`.",
  message: "An endpoint must return either a `Response`, or a `Promise` that resolves with a `Response`."
};
const LocalsNotAnObject = {
  name: "LocalsNotAnObject",
  title: "Value assigned to `locals` is not accepted.",
  message: "`locals` can only be assigned to an object. Other values like numbers, strings, etc. are not accepted.",
  hint: "If you tried to remove some information from the `locals` object, try to use `delete` or set the property to `undefined`."
};
const LocalsReassigned = {
  name: "LocalsReassigned",
  title: "`locals` must not be reassigned.",
  message: "`locals` cannot be assigned directly.",
  hint: "Set a `locals` property instead."
};
const AstroResponseHeadersReassigned = {
  name: "AstroResponseHeadersReassigned",
  title: "`Astro.response.headers` must not be reassigned.",
  message: "Individual headers can be added to and removed from `Astro.response.headers`, but it must not be replaced with another instance of `Headers` altogether.",
  hint: "Consider using `Astro.response.headers.add()`, and `Astro.response.headers.delete()`."
};
const LocalImageUsedWrongly = {
  name: "LocalImageUsedWrongly",
  title: "Local images must be imported.",
  message: (imageFilePath) => `\`Image\`'s and \`getImage\`'s \`src\` parameter must be an imported image or an URL, it cannot be a string filepath. Received \`${imageFilePath}\`.`,
  hint: "If you want to use an image from your `src` folder, you need to either import it or if the image is coming from a content collection, use the [image() schema helper](https://docs.astro.build/en/guides/images/#images-in-content-collections). See https://docs.astro.build/en/guides/images/#src-required for more information on the `src` property."
};
const MissingSharp = {
  name: "MissingSharp",
  title: "Could not find Sharp.",
  message: "Could not find Sharp. Please install Sharp (`sharp`) manually into your project or migrate to another image service.",
  hint: "See Sharp's installation instructions for more information: https://sharp.pixelplumbing.com/install. If you are not relying on `astro:assets` to optimize, transform, or process any images, you can configure a passthrough image service instead of installing Sharp. See https://docs.astro.build/en/reference/errors/missing-sharp for more information.\n\nSee https://docs.astro.build/en/guides/images/#default-image-service for more information on how to migrate to another image service."
};
const i18nNoLocaleFoundInPath = {
  name: "i18nNoLocaleFoundInPath",
  title: "The path doesn't contain any locale",
  message: "You tried to use an i18n utility on a path that doesn't contain any locale. You can use `pathHasLocale` first to determine if the path has a locale."
};
const RewriteWithBodyUsed = {
  name: "RewriteWithBodyUsed",
  title: "Cannot use Astro.rewrite after the request body has been read",
  message: "Astro.rewrite() cannot be used if the request body has already been read. If you need to read the body, first clone the request."
};
const ForbiddenRewrite = {
  name: "ForbiddenRewrite",
  title: "Forbidden rewrite to a static route.",
  message: (from, to, component) => `You tried to rewrite the on-demand route '${from}' with the static route '${to}', when using the 'server' output. 

The static route '${to}' is rendered by the component
'${component}', which is marked as prerendered. This is a forbidden operation because during the build, the component '${component}' is compiled to an
HTML file, which can't be retrieved at runtime by Astro.`,
  hint: (component) => `Add \`export const prerender = false\` to the component '${component}', or use a Astro.redirect().`
};
const FontFamilyNotFound = {
  name: "FontFamilyNotFound",
  title: "Font family not found",
  message: (family) => `No data was found for the \`"${family}"\` family passed to the \`<Font>\` component.`,
  hint: "This is often caused by a typo. Check that the `<Font />` component is using a `cssVariable` specified in your config."
};
const MissingGetFontFileRequestUrl = {
  name: "MissingGetFontFileRequestUrl",
  title: "`experimental_getFontFileURL()` requires the request URL with on-demand rendering.",
  hint: "Pass the request URL as the 2nd argument, for example `Astro.url`."
};
const UnableToLoadLogger = {
  name: "UnableToLoadLogger",
  title: "Unable to load the logger.",
  message: (path) => `Couldn't load the logger at given path "${path}".`
};
const ActionsReturnedInvalidDataError = {
  name: "ActionsReturnedInvalidDataError",
  title: "Action handler returned invalid data.",
  message: (error) => `Action handler returned invalid data. Handlers should return serializable data types like objects, arrays, strings, and numbers. Parse error: ${error}`,
  hint: "See the devalue library for all supported types: https://github.com/rich-harris/devalue"
};
const ActionNotFoundError = {
  name: "ActionNotFoundError",
  title: "Action not found.",
  message: (actionName) => `The server received a request for an action named \`${actionName}\` but could not find a match. If you renamed an action, check that you've updated your \`actions/index\` file and your calling code to match.`,
  hint: "You can run `astro check` to detect type errors caused by mismatched action names."
};
const SessionStorageInitError = {
  name: "SessionStorageInitError",
  title: "Session storage could not be initialized.",
  message: (error, driver) => `Error when initializing session storage${driver ? ` with driver \`${driver}\`` : ""}. \`${error ?? ""}\``,
  hint: "For more information, see https://docs.astro.build/en/guides/sessions/"
};
const SessionStorageSaveError = {
  name: "SessionStorageSaveError",
  title: "Session data could not be saved.",
  message: (error, driver) => `Error when saving session data${driver ? ` with driver \`${driver}\`` : ""}. \`${error ?? ""}\``,
  hint: "For more information, see https://docs.astro.build/en/guides/sessions/"
};
const CacheNotEnabled = {
  name: "CacheNotEnabled",
  title: "Cache is not enabled.",
  message: "`Astro.cache` is not available because the cache feature is not enabled. To use caching, configure a cache provider in your Astro config under `experimental.cache`.",
  hint: 'Use an adapter that provides a default cache provider, or set one explicitly: `experimental: { cache: { provider: "..." } }`. See https://docs.astro.build/en/reference/experimental-flags/route-caching/.'
};

function matchPattern(url, remotePattern) {
  return matchProtocol(url, remotePattern.protocol) && matchHostname(url, remotePattern.hostname, true) && matchPort(url, remotePattern.port) && matchPathname(url, remotePattern.pathname, true);
}
function matchPort(url, port) {
  return !port || port === url.port;
}
function matchProtocol(url, protocol) {
  return !protocol || protocol === url.protocol.slice(0, -1);
}
function matchHostname(url, hostname, allowWildcard = false) {
  if (!hostname) {
    return true;
  } else if (!allowWildcard || !hostname.startsWith("*")) {
    return hostname === url.hostname;
  } else if (hostname.startsWith("**.")) {
    const slicedHostname = hostname.slice(2);
    return slicedHostname !== url.hostname && url.hostname.endsWith(slicedHostname);
  } else if (hostname.startsWith("*.")) {
    const slicedHostname = hostname.slice(1);
    if (!url.hostname.endsWith(slicedHostname)) {
      return false;
    }
    const subdomainWithDot = url.hostname.slice(0, -(slicedHostname.length - 1));
    return subdomainWithDot.endsWith(".") && !subdomainWithDot.slice(0, -1).includes(".");
  }
  return false;
}
function matchPathname(url, pathname, allowWildcard = false) {
  if (!pathname) {
    return true;
  } else if (!allowWildcard || !pathname.endsWith("*")) {
    return pathname === url.pathname;
  } else if (pathname.endsWith("/**")) {
    const slicedPathname = pathname.slice(0, -2);
    return slicedPathname !== url.pathname && url.pathname.startsWith(slicedPathname);
  } else if (pathname.endsWith("/*")) {
    const slicedPathname = pathname.slice(0, -1);
    if (!url.pathname.startsWith(slicedPathname)) {
      return false;
    }
    const additionalPathChunks = url.pathname.slice(slicedPathname.length).split("/").filter(Boolean);
    return additionalPathChunks.length === 1;
  }
  return false;
}
function isRemoteAllowed(src, {
  domains,
  remotePatterns
}) {
  if (!URL.canParse(src)) {
    return false;
  }
  const url = new URL(src);
  if (!["http:", "https:", "data:"].includes(url.protocol)) {
    return false;
  }
  return domains.some((domain) => matchHostname(url, domain)) || remotePatterns.some((remotePattern) => matchPattern(url, remotePattern));
}

const decoder$2 = new TextDecoder();
const toUTF8String = (input, start = 0, end = input.length) => decoder$2.decode(input.slice(start, end));
const toHexString = (input, start = 0, end = input.length) => input.slice(start, end).reduce((memo, i) => memo + `0${i.toString(16)}`.slice(-2), "");
const getView = (input, offset) => new DataView(input.buffer, input.byteOffset + offset);
const readInt16LE = (input, offset = 0) => getView(input, offset).getInt16(0, true);
const readUInt16BE = (input, offset = 0) => getView(input, offset).getUint16(0, false);
const readUInt16LE = (input, offset = 0) => getView(input, offset).getUint16(0, true);
const readUInt24LE = (input, offset = 0) => {
  const view = getView(input, offset);
  return view.getUint16(0, true) + (view.getUint8(2) << 16);
};
const readInt32LE = (input, offset = 0) => getView(input, offset).getInt32(0, true);
const readUInt32BE = (input, offset = 0) => getView(input, offset).getUint32(0, false);
const readUInt32LE = (input, offset = 0) => getView(input, offset).getUint32(0, true);
const readUInt64 = (input, offset, isBigEndian) => getView(input, offset).getBigUint64(0, !isBigEndian);
const methods = {
  readUInt16BE,
  readUInt16LE,
  readUInt32BE,
  readUInt32LE
};
function readUInt(input, bits, offset = 0, isBigEndian = false) {
  const endian = isBigEndian ? "BE" : "LE";
  const methodName = `readUInt${bits}${endian}`;
  return methods[methodName](input, offset);
}
function readBox(input, offset) {
  if (input.length - offset < 4) return;
  const boxSize = readUInt32BE(input, offset);
  if (input.length - offset < boxSize) return;
  return {
    name: toUTF8String(input, 4 + offset, 8 + offset),
    offset,
    size: boxSize
  };
}
function findBox(input, boxName, currentOffset) {
  while (currentOffset < input.length) {
    const box = readBox(input, currentOffset);
    if (!box) break;
    if (box.name === boxName) return box;
    currentOffset += box.size > 0 ? box.size : 8;
  }
}

const BMP = {
  validate: (input) => toUTF8String(input, 0, 2) === "BM",
  calculate: (input) => ({
    height: Math.abs(readInt32LE(input, 22)),
    width: readUInt32LE(input, 18)
  })
};

const TYPE_ICON = 1;
const SIZE_HEADER$1 = 2 + 2 + 2;
const SIZE_IMAGE_ENTRY = 1 + 1 + 1 + 1 + 2 + 2 + 4 + 4;
function getSizeFromOffset(input, offset) {
  const value = input[offset];
  return value === 0 ? 256 : value;
}
function getImageSize$1(input, imageIndex) {
  const offset = SIZE_HEADER$1 + imageIndex * SIZE_IMAGE_ENTRY;
  return {
    height: getSizeFromOffset(input, offset + 1),
    width: getSizeFromOffset(input, offset)
  };
}
const ICO = {
  validate(input) {
    const reserved = readUInt16LE(input, 0);
    const imageCount = readUInt16LE(input, 4);
    if (reserved !== 0 || imageCount === 0) return false;
    const imageType = readUInt16LE(input, 2);
    return imageType === TYPE_ICON;
  },
  calculate(input) {
    const nbImages = readUInt16LE(input, 4);
    const imageSize = getImageSize$1(input, 0);
    if (nbImages === 1) return imageSize;
    const images = [];
    for (let imageIndex = 0; imageIndex < nbImages; imageIndex += 1) {
      images.push(getImageSize$1(input, imageIndex));
    }
    return {
      width: imageSize.width,
      height: imageSize.height,
      images
    };
  }
};

const TYPE_CURSOR = 2;
const CUR = {
  validate(input) {
    const reserved = readUInt16LE(input, 0);
    const imageCount = readUInt16LE(input, 4);
    if (reserved !== 0 || imageCount === 0) return false;
    const imageType = readUInt16LE(input, 2);
    return imageType === TYPE_CURSOR;
  },
  calculate: (input) => ICO.calculate(input)
};

const DDS = {
  validate: (input) => readUInt32LE(input, 0) === 542327876,
  calculate: (input) => ({
    height: readUInt32LE(input, 12),
    width: readUInt32LE(input, 16)
  })
};

const gifRegexp = /^GIF8[79]a/;
const GIF = {
  validate: (input) => gifRegexp.test(toUTF8String(input, 0, 6)),
  calculate: (input) => ({
    height: readUInt16LE(input, 8),
    width: readUInt16LE(input, 6)
  })
};

const brandMap = {
  avif: "avif",
  avis: "avif",
  // avif-sequence
  mif1: "heif",
  msf1: "heif",
  // heif-sequence
  heic: "heic",
  heix: "heic",
  hevc: "heic",
  // heic-sequence
  hevx: "heic"
  // heic-sequence
};
function detectType(input, start, end) {
  let hasAvif = false;
  let hasHeic = false;
  let hasHeif = false;
  for (let i = start; i <= end; i += 4) {
    const brand = toUTF8String(input, i, i + 4);
    if (brand === "avif" || brand === "avis") hasAvif = true;
    else if (brand === "heic" || brand === "heix" || brand === "hevc" || brand === "hevx") hasHeic = true;
    else if (brand === "mif1" || brand === "msf1") hasHeif = true;
  }
  if (hasAvif) return "avif";
  if (hasHeic) return "heic";
  if (hasHeif) return "heif";
}
const HEIF = {
  validate(input) {
    const boxType = toUTF8String(input, 4, 8);
    if (boxType !== "ftyp") return false;
    const ftypBox = findBox(input, "ftyp", 0);
    if (!ftypBox) return false;
    const brand = toUTF8String(input, ftypBox.offset + 8, ftypBox.offset + 12);
    return brand in brandMap;
  },
  calculate(input) {
    const metaBox = findBox(input, "meta", 0);
    const iprpBox = metaBox && findBox(input, "iprp", metaBox.offset + 12);
    const ipcoBox = iprpBox && findBox(input, "ipco", iprpBox.offset + 8);
    if (!ipcoBox) {
      throw new TypeError("Invalid HEIF, no ipco box found");
    }
    const type = detectType(input, 8, metaBox.offset);
    const images = [];
    let currentOffset = ipcoBox.offset + 8;
    while (currentOffset < ipcoBox.offset + ipcoBox.size) {
      const ispeBox = findBox(input, "ispe", currentOffset);
      if (!ispeBox) break;
      const rawWidth = readUInt32BE(input, ispeBox.offset + 12);
      const rawHeight = readUInt32BE(input, ispeBox.offset + 16);
      const clapBox = findBox(input, "clap", currentOffset);
      let width = rawWidth;
      let height = rawHeight;
      if (clapBox && clapBox.offset < ipcoBox.offset + ipcoBox.size) {
        const cropRight = readUInt32BE(input, clapBox.offset + 12);
        width = rawWidth - cropRight;
      }
      images.push({ height, width });
      currentOffset = ispeBox.offset + ispeBox.size;
    }
    if (images.length === 0) {
      throw new TypeError("Invalid HEIF, no sizes found");
    }
    return {
      width: images[0].width,
      height: images[0].height,
      type,
      ...images.length > 1 ? { images } : {}
    };
  }
};

const SIZE_HEADER = 4 + 4;
const FILE_LENGTH_OFFSET = 4;
const ENTRY_LENGTH_OFFSET = 4;
const ICON_TYPE_SIZE = {
  ICON: 32,
  "ICN#": 32,
  // m => 16 x 16
  "icm#": 16,
  icm4: 16,
  icm8: 16,
  // s => 16 x 16
  "ics#": 16,
  ics4: 16,
  ics8: 16,
  is32: 16,
  s8mk: 16,
  icp4: 16,
  // l => 32 x 32
  icl4: 32,
  icl8: 32,
  il32: 32,
  l8mk: 32,
  icp5: 32,
  ic11: 32,
  // h => 48 x 48
  ich4: 48,
  ich8: 48,
  ih32: 48,
  h8mk: 48,
  // . => 64 x 64
  icp6: 64,
  ic12: 32,
  // t => 128 x 128
  it32: 128,
  t8mk: 128,
  ic07: 128,
  // . => 256 x 256
  ic08: 256,
  ic13: 256,
  // . => 512 x 512
  ic09: 512,
  ic14: 512,
  // . => 1024 x 1024
  ic10: 1024
};
function readImageHeader(input, imageOffset) {
  const imageLengthOffset = imageOffset + ENTRY_LENGTH_OFFSET;
  return [
    toUTF8String(input, imageOffset, imageLengthOffset),
    readUInt32BE(input, imageLengthOffset)
  ];
}
function getImageSize(type) {
  const size = ICON_TYPE_SIZE[type];
  return { width: size, height: size, type };
}
const ICNS = {
  validate: (input) => toUTF8String(input, 0, 4) === "icns",
  calculate(input) {
    const inputLength = input.length;
    const fileLength = readUInt32BE(input, FILE_LENGTH_OFFSET);
    let imageOffset = SIZE_HEADER;
    const images = [];
    while (imageOffset < fileLength && imageOffset < inputLength) {
      const imageHeader = readImageHeader(input, imageOffset);
      const imageSize = getImageSize(imageHeader[0]);
      images.push(imageSize);
      imageOffset += imageHeader[1];
    }
    if (images.length === 0) {
      throw new TypeError("Invalid ICNS, no sizes found");
    }
    return {
      width: images[0].width,
      height: images[0].height,
      ...images.length > 1 ? { images } : {}
    };
  }
};

const J2C = {
  // TODO: this doesn't seem right. SIZ marker doesn't have to be right after the SOC
  validate: (input) => readUInt32BE(input, 0) === 4283432785,
  calculate: (input) => ({
    height: readUInt32BE(input, 12),
    width: readUInt32BE(input, 8)
  })
};

const JP2 = {
  validate(input) {
    const boxType = toUTF8String(input, 4, 8);
    if (boxType !== "jP  ") return false;
    const ftypBox = findBox(input, "ftyp", 0);
    if (!ftypBox) return false;
    const brand = toUTF8String(input, ftypBox.offset + 8, ftypBox.offset + 12);
    return brand === "jp2 ";
  },
  calculate(input) {
    const jp2hBox = findBox(input, "jp2h", 0);
    const ihdrBox = jp2hBox && findBox(input, "ihdr", jp2hBox.offset + 8);
    if (ihdrBox) {
      return {
        height: readUInt32BE(input, ihdrBox.offset + 8),
        width: readUInt32BE(input, ihdrBox.offset + 12)
      };
    }
    throw new TypeError("Unsupported JPEG 2000 format");
  }
};

const EXIF_MARKER = "45786966";
const APP1_DATA_SIZE_BYTES = 2;
const EXIF_HEADER_BYTES = 6;
const TIFF_BYTE_ALIGN_BYTES = 2;
const BIG_ENDIAN_BYTE_ALIGN = "4d4d";
const LITTLE_ENDIAN_BYTE_ALIGN = "4949";
const IDF_ENTRY_BYTES = 12;
const NUM_DIRECTORY_ENTRIES_BYTES = 2;
function isEXIF(input) {
  return toHexString(input, 2, 6) === EXIF_MARKER;
}
function extractSize(input, index) {
  return {
    height: readUInt16BE(input, index),
    width: readUInt16BE(input, index + 2)
  };
}
function extractOrientation(exifBlock, isBigEndian) {
  const idfOffset = 8;
  const offset = EXIF_HEADER_BYTES + idfOffset;
  const idfDirectoryEntries = readUInt(exifBlock, 16, offset, isBigEndian);
  for (let directoryEntryNumber = 0; directoryEntryNumber < idfDirectoryEntries; directoryEntryNumber++) {
    const start = offset + NUM_DIRECTORY_ENTRIES_BYTES + directoryEntryNumber * IDF_ENTRY_BYTES;
    const end = start + IDF_ENTRY_BYTES;
    if (start > exifBlock.length) {
      return;
    }
    const block = exifBlock.slice(start, end);
    const tagNumber = readUInt(block, 16, 0, isBigEndian);
    if (tagNumber === 274) {
      const dataFormat = readUInt(block, 16, 2, isBigEndian);
      if (dataFormat !== 3) {
        return;
      }
      const numberOfComponents = readUInt(block, 32, 4, isBigEndian);
      if (numberOfComponents !== 1) {
        return;
      }
      return readUInt(block, 16, 8, isBigEndian);
    }
  }
}
function validateExifBlock(input, index) {
  const exifBlock = input.slice(APP1_DATA_SIZE_BYTES, index);
  const byteAlign = toHexString(
    exifBlock,
    EXIF_HEADER_BYTES,
    EXIF_HEADER_BYTES + TIFF_BYTE_ALIGN_BYTES
  );
  const isBigEndian = byteAlign === BIG_ENDIAN_BYTE_ALIGN;
  const isLittleEndian = byteAlign === LITTLE_ENDIAN_BYTE_ALIGN;
  if (isBigEndian || isLittleEndian) {
    return extractOrientation(exifBlock, isBigEndian);
  }
}
function validateInput(input, index) {
  if (index > input.length) {
    throw new TypeError("Corrupt JPG, exceeded buffer limits");
  }
}
const JPG = {
  validate: (input) => toHexString(input, 0, 2) === "ffd8",
  calculate(_input) {
    let input = _input.slice(4);
    let orientation;
    let next;
    while (input.length) {
      const i = readUInt16BE(input, 0);
      validateInput(input, i);
      if (input[i] !== 255) {
        input = input.slice(1);
        continue;
      }
      if (isEXIF(input)) {
        orientation = validateExifBlock(input, i);
      }
      next = input[i + 1];
      if (next === 192 || next === 193 || next === 194) {
        const size = extractSize(input, i + 5);
        if (!orientation) {
          return size;
        }
        return {
          height: size.height,
          orientation,
          width: size.width
        };
      }
      input = input.slice(i + 2);
    }
    throw new TypeError("Invalid JPG, no size found");
  }
};

class BitReader {
  // Skip the first 16 bits (2 bytes) of signature
  byteOffset = 2;
  bitOffset = 0;
  input;
  endianness;
  constructor(input, endianness) {
    this.input = input;
    this.endianness = endianness;
  }
  /** Reads a specified number of bits, and move the offset */
  getBits(length = 1) {
    let result = 0;
    let bitsRead = 0;
    while (bitsRead < length) {
      if (this.byteOffset >= this.input.length) {
        throw new Error("Reached end of input");
      }
      const currentByte = this.input[this.byteOffset];
      const bitsLeft = 8 - this.bitOffset;
      const bitsToRead = Math.min(length - bitsRead, bitsLeft);
      if (this.endianness === "little-endian") {
        const mask = (1 << bitsToRead) - 1;
        const bits = currentByte >> this.bitOffset & mask;
        result |= bits << bitsRead;
      } else {
        const mask = (1 << bitsToRead) - 1 << 8 - this.bitOffset - bitsToRead;
        const bits = (currentByte & mask) >> 8 - this.bitOffset - bitsToRead;
        result = result << bitsToRead | bits;
      }
      bitsRead += bitsToRead;
      this.bitOffset += bitsToRead;
      if (this.bitOffset === 8) {
        this.byteOffset++;
        this.bitOffset = 0;
      }
    }
    return result;
  }
}

function calculateImageDimension(reader, isSmallImage) {
  if (isSmallImage) {
    return 8 * (1 + reader.getBits(5));
  }
  const sizeClass = reader.getBits(2);
  const extraBits = [9, 13, 18, 30][sizeClass];
  return 1 + reader.getBits(extraBits);
}
function calculateImageWidth(reader, isSmallImage, widthMode, height) {
  if (isSmallImage && widthMode === 0) {
    return 8 * (1 + reader.getBits(5));
  }
  if (widthMode === 0) {
    return calculateImageDimension(reader, false);
  }
  const aspectRatios = [1, 1.2, 4 / 3, 1.5, 16 / 9, 5 / 4, 2];
  return Math.floor(height * aspectRatios[widthMode - 1]);
}
const JXLStream = {
  validate: (input) => {
    return toHexString(input, 0, 2) === "ff0a";
  },
  calculate(input) {
    const reader = new BitReader(input, "little-endian");
    const isSmallImage = reader.getBits(1) === 1;
    const height = calculateImageDimension(reader, isSmallImage);
    const widthMode = reader.getBits(3);
    const width = calculateImageWidth(reader, isSmallImage, widthMode, height);
    return { width, height };
  }
};

function extractCodestream(input) {
  const jxlcBox = findBox(input, "jxlc", 0);
  if (jxlcBox) {
    return input.slice(jxlcBox.offset + 8, jxlcBox.offset + jxlcBox.size);
  }
  const partialStreams = extractPartialStreams(input);
  if (partialStreams.length > 0) {
    return concatenateCodestreams(partialStreams);
  }
  return void 0;
}
function extractPartialStreams(input) {
  const partialStreams = [];
  let offset = 0;
  while (offset < input.length) {
    const jxlpBox = findBox(input, "jxlp", offset);
    if (!jxlpBox) break;
    partialStreams.push(
      input.slice(jxlpBox.offset + 12, jxlpBox.offset + jxlpBox.size)
    );
    offset = jxlpBox.offset + jxlpBox.size;
  }
  return partialStreams;
}
function concatenateCodestreams(partialCodestreams) {
  const totalLength = partialCodestreams.reduce(
    (acc, curr) => acc + curr.length,
    0
  );
  const codestream = new Uint8Array(totalLength);
  let position = 0;
  for (const partial of partialCodestreams) {
    codestream.set(partial, position);
    position += partial.length;
  }
  return codestream;
}
const JXL = {
  validate: (input) => {
    const boxType = toUTF8String(input, 4, 8);
    if (boxType !== "JXL ") return false;
    const ftypBox = findBox(input, "ftyp", 0);
    if (!ftypBox) return false;
    const brand = toUTF8String(input, ftypBox.offset + 8, ftypBox.offset + 12);
    return brand === "jxl ";
  },
  calculate(input) {
    const codestream = extractCodestream(input);
    if (codestream) return JXLStream.calculate(codestream);
    throw new Error("No codestream found in JXL container");
  }
};

const KTX = {
  validate: (input) => {
    const signature = toUTF8String(input, 1, 7);
    return ["KTX 11", "KTX 20"].includes(signature);
  },
  calculate: (input) => {
    const type = input[5] === 49 ? "ktx" : "ktx2";
    const offset = type === "ktx" ? 36 : 20;
    return {
      height: readUInt32LE(input, offset + 4),
      width: readUInt32LE(input, offset),
      type
    };
  }
};

const pngSignature = "PNG\r\n\n";
const pngImageHeaderChunkName = "IHDR";
const pngFriedChunkName = "CgBI";
const PNG = {
  validate(input) {
    if (pngSignature === toUTF8String(input, 1, 8)) {
      let chunkName = toUTF8String(input, 12, 16);
      if (chunkName === pngFriedChunkName) {
        chunkName = toUTF8String(input, 28, 32);
      }
      if (chunkName !== pngImageHeaderChunkName) {
        throw new TypeError("Invalid PNG");
      }
      return true;
    }
    return false;
  },
  calculate(input) {
    if (toUTF8String(input, 12, 16) === pngFriedChunkName) {
      return {
        height: readUInt32BE(input, 36),
        width: readUInt32BE(input, 32)
      };
    }
    return {
      height: readUInt32BE(input, 20),
      width: readUInt32BE(input, 16)
    };
  }
};

const PNMTypes = {
  P1: "pbm/ascii",
  P2: "pgm/ascii",
  P3: "ppm/ascii",
  P4: "pbm",
  P5: "pgm",
  P6: "ppm",
  P7: "pam",
  PF: "pfm"
};
const handlers = {
  default: (lines) => {
    let dimensions = [];
    while (lines.length > 0) {
      const line = lines.shift();
      if (line[0] === "#") {
        continue;
      }
      dimensions = line.split(" ");
      break;
    }
    if (dimensions.length === 2) {
      return {
        height: Number.parseInt(dimensions[1], 10),
        width: Number.parseInt(dimensions[0], 10)
      };
    }
    throw new TypeError("Invalid PNM");
  },
  pam: (lines) => {
    const size = {};
    while (lines.length > 0) {
      const line = lines.shift();
      if (line.length > 16 || line.charCodeAt(0) > 128) {
        continue;
      }
      const [key, value] = line.split(" ");
      if (key && value) {
        size[key.toLowerCase()] = Number.parseInt(value, 10);
      }
      if (size.height && size.width) {
        break;
      }
    }
    if (size.height && size.width) {
      return {
        height: size.height,
        width: size.width
      };
    }
    throw new TypeError("Invalid PAM");
  }
};
const PNM = {
  validate: (input) => toUTF8String(input, 0, 2) in PNMTypes,
  calculate(input) {
    const signature = toUTF8String(input, 0, 2);
    const type = PNMTypes[signature];
    const lines = toUTF8String(input, 3).split(/[\r\n]+/);
    const handler = handlers[type] || handlers.default;
    return handler(lines);
  }
};

const PSD = {
  validate: (input) => toUTF8String(input, 0, 4) === "8BPS",
  calculate: (input) => ({
    height: readUInt32BE(input, 14),
    width: readUInt32BE(input, 18)
  })
};

const svgReg = /<svg\s([^>"']|"[^"]*"|'[^']*')*>/;
const extractorRegExps = {
  height: /\sheight=(['"])([^%]+?)\1/,
  root: svgReg,
  viewbox: /\sviewBox=(['"])(.+?)\1/i,
  width: /\swidth=(['"])([^%]+?)\1/
};
const INCH_CM = 2.54;
const units = {
  in: 96,
  cm: 96 / INCH_CM,
  em: 16,
  ex: 8,
  m: 96 / INCH_CM * 100,
  mm: 96 / INCH_CM / 10,
  pc: 96 / 72 / 12,
  pt: 96 / 72,
  px: 1
};
const unitsReg = new RegExp(
  `^([0-9.]+(?:e\\d+)?)(${Object.keys(units).join("|")})?$`
);
function parseLength(len) {
  const m = unitsReg.exec(len);
  if (!m) {
    return void 0;
  }
  return Math.round(Number(m[1]) * (units[m[2]] || 1));
}
function parseViewbox(viewbox) {
  const bounds = viewbox.split(" ");
  return {
    height: parseLength(bounds[3]),
    width: parseLength(bounds[2])
  };
}
function parseAttributes(root) {
  const width = extractorRegExps.width.exec(root);
  const height = extractorRegExps.height.exec(root);
  const viewbox = extractorRegExps.viewbox.exec(root);
  return {
    height: height && parseLength(height[2]),
    viewbox: viewbox && parseViewbox(viewbox[2]),
    width: width && parseLength(width[2])
  };
}
function calculateByDimensions(attrs) {
  return {
    height: attrs.height,
    width: attrs.width
  };
}
function calculateByViewbox(attrs, viewbox) {
  const ratio = viewbox.width / viewbox.height;
  if (attrs.width) {
    return {
      height: Math.floor(attrs.width / ratio),
      width: attrs.width
    };
  }
  if (attrs.height) {
    return {
      height: attrs.height,
      width: Math.floor(attrs.height * ratio)
    };
  }
  return {
    height: viewbox.height,
    width: viewbox.width
  };
}
const SVG = {
  // Scan only the first kilo-byte to speed up the check on larger files
  validate: (input) => svgReg.test(toUTF8String(input, 0, 1e3)),
  calculate(input) {
    const root = extractorRegExps.root.exec(toUTF8String(input));
    if (root) {
      const attrs = parseAttributes(root[0]);
      if (attrs.width && attrs.height) {
        return calculateByDimensions(attrs);
      }
      if (attrs.viewbox) {
        return calculateByViewbox(attrs, attrs.viewbox);
      }
    }
    throw new TypeError("Invalid SVG");
  }
};

const TGA = {
  validate(input) {
    return readUInt16LE(input, 0) === 0 && readUInt16LE(input, 4) === 0;
  },
  calculate(input) {
    return {
      height: readUInt16LE(input, 14),
      width: readUInt16LE(input, 12)
    };
  }
};

const CONSTANTS = {
  TAG: {
    WIDTH: 256,
    HEIGHT: 257,
    COMPRESSION: 259
  },
  TYPE: {
    SHORT: 3,
    LONG: 4,
    LONG8: 16
  },
  ENTRY_SIZE: {
    STANDARD: 12,
    BIG: 20
  },
  COUNT_SIZE: {
    STANDARD: 2,
    BIG: 8
  }
};
function readIFD(input, { isBigEndian, isBigTiff }) {
  const ifdOffset = isBigTiff ? Number(readUInt64(input, 8, isBigEndian)) : readUInt(input, 32, 4, isBigEndian);
  const entryCountSize = isBigTiff ? CONSTANTS.COUNT_SIZE.BIG : CONSTANTS.COUNT_SIZE.STANDARD;
  return input.slice(ifdOffset + entryCountSize);
}
function readTagValue(input, type, offset, isBigEndian) {
  switch (type) {
    case CONSTANTS.TYPE.SHORT:
      return readUInt(input, 16, offset, isBigEndian);
    case CONSTANTS.TYPE.LONG:
      return readUInt(input, 32, offset, isBigEndian);
    case CONSTANTS.TYPE.LONG8: {
      const value = Number(readUInt64(input, offset, isBigEndian));
      if (value > Number.MAX_SAFE_INTEGER) {
        throw new TypeError("Value too large");
      }
      return value;
    }
    default:
      return 0;
  }
}
function nextTag(input, isBigTiff) {
  const entrySize = isBigTiff ? CONSTANTS.ENTRY_SIZE.BIG : CONSTANTS.ENTRY_SIZE.STANDARD;
  if (input.length > entrySize) {
    return input.slice(entrySize);
  }
}
function extractTags(input, { isBigEndian, isBigTiff }) {
  const tags = {};
  let temp = input;
  while (temp?.length) {
    const code = readUInt(temp, 16, 0, isBigEndian);
    const type = readUInt(temp, 16, 2, isBigEndian);
    const length = isBigTiff ? Number(readUInt64(temp, 4, isBigEndian)) : readUInt(temp, 32, 4, isBigEndian);
    if (code === 0) break;
    if (length === 1 && (type === CONSTANTS.TYPE.SHORT || type === CONSTANTS.TYPE.LONG || isBigTiff && type === CONSTANTS.TYPE.LONG8)) {
      const valueOffset = isBigTiff ? 12 : 8;
      tags[code] = readTagValue(temp, type, valueOffset, isBigEndian);
    }
    temp = nextTag(temp, isBigTiff);
  }
  return tags;
}
function determineFormat(input) {
  const signature = toUTF8String(input, 0, 2);
  const version = readUInt(input, 16, 2, signature === "MM");
  return {
    isBigEndian: signature === "MM",
    isBigTiff: version === 43
  };
}
function validateBigTIFFHeader(input, isBigEndian) {
  const byteSize = readUInt(input, 16, 4, isBigEndian);
  const reserved = readUInt(input, 16, 6, isBigEndian);
  if (byteSize !== 8 || reserved !== 0) {
    throw new TypeError("Invalid BigTIFF header");
  }
}
const signatures = /* @__PURE__ */ new Set([
  "49492a00",
  // Little Endian
  "4d4d002a",
  // Big Endian
  "49492b00",
  // BigTIFF Little Endian
  "4d4d002b"
  // BigTIFF Big Endian
]);
const TIFF = {
  validate: (input) => {
    const signature = toHexString(input, 0, 4);
    return signatures.has(signature);
  },
  calculate(input) {
    const format = determineFormat(input);
    if (format.isBigTiff) {
      validateBigTIFFHeader(input, format.isBigEndian);
    }
    const ifdBuffer = readIFD(input, format);
    const tags = extractTags(ifdBuffer, format);
    const info = {
      height: tags[CONSTANTS.TAG.HEIGHT],
      width: tags[CONSTANTS.TAG.WIDTH],
      type: format.isBigTiff ? "bigtiff" : "tiff"
    };
    if (tags[CONSTANTS.TAG.COMPRESSION]) {
      info.compression = tags[CONSTANTS.TAG.COMPRESSION];
    }
    if (!info.width || !info.height) {
      throw new TypeError("Invalid Tiff. Missing tags");
    }
    return info;
  }
};

function calculateExtended(input) {
  return {
    height: 1 + readUInt24LE(input, 7),
    width: 1 + readUInt24LE(input, 4)
  };
}
function calculateLossless(input) {
  return {
    height: 1 + ((input[4] & 15) << 10 | input[3] << 2 | (input[2] & 192) >> 6),
    width: 1 + ((input[2] & 63) << 8 | input[1])
  };
}
function calculateLossy(input) {
  return {
    height: readInt16LE(input, 8) & 16383,
    width: readInt16LE(input, 6) & 16383
  };
}
const WEBP = {
  validate(input) {
    const riffHeader = "RIFF" === toUTF8String(input, 0, 4);
    const webpHeader = "WEBP" === toUTF8String(input, 8, 12);
    const vp8Header = "VP8" === toUTF8String(input, 12, 15);
    return riffHeader && webpHeader && vp8Header;
  },
  calculate(_input) {
    const chunkHeader = toUTF8String(_input, 12, 16);
    const input = _input.slice(20, 30);
    if (chunkHeader === "VP8X") {
      const extendedHeader = input[0];
      const validStart = (extendedHeader & 192) === 0;
      const validEnd = (extendedHeader & 1) === 0;
      if (validStart && validEnd) {
        return calculateExtended(input);
      }
      throw new TypeError("Invalid WebP");
    }
    if (chunkHeader === "VP8 " && input[0] !== 47) {
      return calculateLossy(input);
    }
    const signature = toHexString(input, 3, 6);
    if (chunkHeader === "VP8L" && signature !== "9d012a") {
      return calculateLossless(input);
    }
    throw new TypeError("Invalid WebP");
  }
};

const typeHandlers = /* @__PURE__ */ new Map([
  ["bmp", BMP],
  ["cur", CUR],
  ["dds", DDS],
  ["gif", GIF],
  ["heif", HEIF],
  ["icns", ICNS],
  ["ico", ICO],
  ["j2c", J2C],
  ["jp2", JP2],
  ["jpg", JPG],
  ["jxl", JXL],
  ["jxl-stream", JXLStream],
  ["ktx", KTX],
  ["png", PNG],
  ["pnm", PNM],
  ["psd", PSD],
  ["svg", SVG],
  ["tga", TGA],
  ["tiff", TIFF],
  ["webp", WEBP]
]);
const types = Array.from(typeHandlers.keys());

nodePath.posix.join;

const ASTRO_PATH_HEADER = "x-astro-path";
const ASTRO_PATH_PARAM = "x_astro_path";
const ASTRO_LOCALS_HEADER = "x-astro-locals";
const ASTRO_MIDDLEWARE_SECRET_HEADER = "x-astro-middleware-secret";

const middlewareSecret = "2a5306fb-5c71-4892-a6fa-36b2af23cd3c";

function appendForwardSlash(path) {
  return path.endsWith("/") ? path : path + "/";
}
function prependForwardSlash(path) {
  return path[0] === "/" ? path : "/" + path;
}
const MANY_LEADING_SLASHES = /^\/{2,}/;
function collapseDuplicateLeadingSlashes(path) {
  if (!path) {
    return path;
  }
  return path.replace(MANY_LEADING_SLASHES, "/");
}
const MANY_SLASHES = /\/{2,}/g;
function collapseDuplicateSlashes(path) {
  if (!path) {
    return path;
  }
  return path.replace(MANY_SLASHES, "/");
}
const MANY_TRAILING_SLASHES = /\/{2,}$/g;
function collapseDuplicateTrailingSlashes(path, trailingSlash) {
  if (!path) {
    return path;
  }
  return path.replace(MANY_TRAILING_SLASHES, trailingSlash ? "/" : "") || "/";
}
function removeTrailingForwardSlash(path) {
  return path.endsWith("/") ? path.slice(0, path.length - 1) : path;
}
function removeLeadingForwardSlash(path) {
  return path.startsWith("/") ? path.substring(1) : path;
}
function trimSlashes(path) {
  return path.replace(/^\/|\/$/g, "");
}
function isString(path) {
  return typeof path === "string" || path instanceof String;
}
const INTERNAL_PREFIXES = /* @__PURE__ */ new Set(["/_", "/@", "/.", "//"]);
const JUST_SLASHES = /^\/{2,}$/;
function isInternalPath(path) {
  return INTERNAL_PREFIXES.has(path.slice(0, 2)) && !JUST_SLASHES.test(path);
}
function joinPaths(...paths) {
  return paths.filter(isString).map((path, i) => {
    if (i === 0) {
      return removeTrailingForwardSlash(path);
    } else if (i === paths.length - 1) {
      return removeLeadingForwardSlash(path);
    } else {
      return trimSlashes(path);
    }
  }).join("/");
}
function isRemotePath(src) {
  if (!src) return false;
  const trimmed = src.trim();
  if (!trimmed) return false;
  let decoded = trimmed;
  let previousDecoded = "";
  let maxIterations = 10;
  while (decoded !== previousDecoded && maxIterations > 0) {
    previousDecoded = decoded;
    try {
      decoded = decodeURIComponent(decoded);
    } catch {
      break;
    }
    maxIterations--;
  }
  if (/^[a-zA-Z]:/.test(decoded)) {
    return false;
  }
  if (decoded[0] === "/" && decoded[1] !== "/" && decoded[1] !== "\\") {
    return false;
  }
  if (decoded[0] === "\\") {
    return true;
  }
  if (decoded.startsWith("//")) {
    return true;
  }
  try {
    const url = new URL(decoded, "http://n");
    if (url.username || url.password) {
      return true;
    }
    if (decoded.includes("@") && !url.pathname.includes("@") && !url.search.includes("@")) {
      return true;
    }
    if (url.origin !== "http://n") {
      const protocol = url.protocol.toLowerCase();
      if (protocol === "file:") {
        return false;
      }
      return true;
    }
    if (URL.canParse(decoded)) {
      return true;
    }
    return false;
  } catch {
    return true;
  }
}
function slash(path) {
  return path.replace(/\\/g, "/");
}
function fileExtension(path) {
  const ext = path.split(".").pop();
  return ext !== path ? `.${ext}` : "";
}
const WITH_FILE_EXT = /\/[^/]+\.\w+$/;
function hasFileExtension(path) {
  return WITH_FILE_EXT.test(path);
}

const ACTION_QUERY_PARAMS = {
  actionName: "_action"};
const ACTION_RPC_ROUTE_PATTERN = "/_actions/[...path]";

const __vite_import_meta_env__$1 = {"ASSETS_PREFIX": undefined, "BASE_URL": "/", "DEV": false, "MODE": "production", "PROD": true, "SITE": "https://www.riplosangeles.com", "SSR": true};
const codeToStatusMap = {
  // Implemented from IANA HTTP Status Code Registry
  // https://www.iana.org/assignments/http-status-codes/http-status-codes.xhtml
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  NOT_ACCEPTABLE: 406,
  PROXY_AUTHENTICATION_REQUIRED: 407,
  REQUEST_TIMEOUT: 408,
  CONFLICT: 409,
  GONE: 410,
  LENGTH_REQUIRED: 411,
  PRECONDITION_FAILED: 412,
  CONTENT_TOO_LARGE: 413,
  URI_TOO_LONG: 414,
  UNSUPPORTED_MEDIA_TYPE: 415,
  RANGE_NOT_SATISFIABLE: 416,
  EXPECTATION_FAILED: 417,
  MISDIRECTED_REQUEST: 421,
  UNPROCESSABLE_CONTENT: 422,
  LOCKED: 423,
  FAILED_DEPENDENCY: 424,
  TOO_EARLY: 425,
  UPGRADE_REQUIRED: 426,
  PRECONDITION_REQUIRED: 428,
  TOO_MANY_REQUESTS: 429,
  REQUEST_HEADER_FIELDS_TOO_LARGE: 431,
  UNAVAILABLE_FOR_LEGAL_REASONS: 451,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
  HTTP_VERSION_NOT_SUPPORTED: 505,
  VARIANT_ALSO_NEGOTIATES: 506,
  INSUFFICIENT_STORAGE: 507,
  LOOP_DETECTED: 508,
  NETWORK_AUTHENTICATION_REQUIRED: 511
};
const statusToCodeMap = Object.fromEntries(
  Object.entries(codeToStatusMap).map(([key, value]) => [value, key])
);
class ActionError extends Error {
  type = "AstroActionError";
  code = "INTERNAL_SERVER_ERROR";
  status = 500;
  constructor(params) {
    super(params.message);
    this.code = params.code;
    this.status = ActionError.codeToStatus(params.code);
    if (params.stack) {
      this.stack = params.stack;
    }
  }
  static codeToStatus(code) {
    return codeToStatusMap[code];
  }
  static statusToCode(status) {
    return statusToCodeMap[status] ?? "INTERNAL_SERVER_ERROR";
  }
  static fromJson(body) {
    if (isInputError(body)) {
      return new ActionInputError(body.issues);
    }
    if (isActionError(body)) {
      return new ActionError(body);
    }
    return new ActionError({
      code: "INTERNAL_SERVER_ERROR"
    });
  }
}
function isActionError(error) {
  return typeof error === "object" && error != null && "type" in error && error.type === "AstroActionError";
}
function isInputError(error) {
  return typeof error === "object" && error != null && "type" in error && error.type === "AstroActionInputError" && "issues" in error && Array.isArray(error.issues);
}
class ActionInputError extends ActionError {
  type = "AstroActionInputError";
  // We don't expose all ZodError properties.
  // Not all properties will serialize from server to client,
  // and we don't want to import the full ZodError object into the client.
  issues;
  fields;
  constructor(issues) {
    super({
      message: `Failed to validate: ${JSON.stringify(issues, null, 2)}`,
      code: "BAD_REQUEST"
    });
    this.issues = issues;
    this.fields = {};
    for (const issue of issues) {
      if (issue.path.length > 0) {
        const key = issue.path[0].toString();
        this.fields[key] ??= [];
        this.fields[key]?.push(issue.message);
      }
    }
  }
}
function deserializeActionResult(res) {
  if (res.type === "error") {
    let json;
    try {
      json = JSON.parse(res.body);
    } catch {
      return {
        data: void 0,
        error: new ActionError({
          message: res.body,
          code: "INTERNAL_SERVER_ERROR"
        })
      };
    }
    if (Object.assign(__vite_import_meta_env__$1, { _: "/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/node_modules/.bin/astro" })?.PROD) {
      return { error: ActionError.fromJson(json), data: void 0 };
    } else {
      const error = ActionError.fromJson(json);
      error.stack = actionResultErrorStack.get();
      return {
        error,
        data: void 0
      };
    }
  }
  if (res.type === "empty") {
    return { data: void 0, error: void 0 };
  }
  return {
    data: parse(res.body, {
      URL: (href) => new URL(href)
    }),
    error: void 0
  };
}
const actionResultErrorStack = /* @__PURE__ */ (function actionResultErrorStackFn() {
  let errorStack;
  return {
    set(stack) {
      errorStack = stack;
    },
    get() {
      return errorStack;
    }
  };
})();
function getActionQueryString(name) {
  const searchParams = new URLSearchParams({ [ACTION_QUERY_PARAMS.actionName]: name });
  return `?${searchParams.toString()}`;
}

function shouldAppendForwardSlash(trailingSlash, buildFormat) {
  switch (trailingSlash) {
    case "always":
      return true;
    case "never":
      return false;
    case "ignore": {
      switch (buildFormat) {
        case "directory":
          return true;
        case "preserve":
        case "file":
          return false;
      }
    }
  }
}

const ASTRO_VERSION = "6.3.1";
const ASTRO_GENERATOR = `Astro v${ASTRO_VERSION}`;
const REROUTE_DIRECTIVE_HEADER = "X-Astro-Reroute";
const REWRITE_DIRECTIVE_HEADER_KEY = "X-Astro-Rewrite";
const REWRITE_DIRECTIVE_HEADER_VALUE = "yes";
const NOOP_MIDDLEWARE_HEADER = "X-Astro-Noop";
const ROUTE_TYPE_HEADER = "X-Astro-Route-Type";
const INTERNAL_RESPONSE_HEADERS = [
  REROUTE_DIRECTIVE_HEADER,
  REWRITE_DIRECTIVE_HEADER_KEY,
  NOOP_MIDDLEWARE_HEADER,
  ROUTE_TYPE_HEADER
];
const ASTRO_ERROR_HEADER = "X-Astro-Error";
const DEFAULT_404_COMPONENT = "astro-default-404.astro";
const REDIRECT_STATUS_CODES = [301, 302, 303, 307, 308, 300, 304];
const REROUTABLE_STATUS_CODES = [404, 500];
const clientAddressSymbol = /* @__PURE__ */ Symbol.for("astro.clientAddress");
const originPathnameSymbol = /* @__PURE__ */ Symbol.for("astro.originPathname");
const pipelineSymbol = /* @__PURE__ */ Symbol.for("astro.pipeline");
const fetchStateSymbol = /* @__PURE__ */ Symbol.for("astro.fetchState");
const appSymbol = /* @__PURE__ */ Symbol.for("astro.app");
const responseSentSymbol$1 = /* @__PURE__ */ Symbol.for("astro.responseSent");

async function readBodyWithLimit(request, limit) {
  const contentLengthHeader = request.headers.get("content-length");
  if (contentLengthHeader) {
    const contentLength = Number.parseInt(contentLengthHeader, 10);
    if (Number.isFinite(contentLength) && contentLength > limit) {
      throw new BodySizeLimitError(limit);
    }
  }
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      received += value.byteLength;
      if (received > limit) {
        throw new BodySizeLimitError(limit);
      }
      chunks.push(value);
    }
  }
  const buffer = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return buffer;
}
class BodySizeLimitError extends Error {
  limit;
  constructor(limit) {
    super(`Request body exceeds the configured limit of ${limit} bytes`);
    this.name = "BodySizeLimitError";
    this.limit = limit;
  }
}

const __vite_import_meta_env__ = {"ASSETS_PREFIX": undefined, "BASE_URL": "/", "DEV": false, "MODE": "production", "PROD": true, "SITE": "https://www.riplosangeles.com", "SSR": true};
function getActionContext(context) {
  const callerInfo = getCallerInfo(context);
  const actionResultAlreadySet = Boolean(context.locals._actionPayload);
  let action = void 0;
  if (callerInfo && context.request.method === "POST" && !actionResultAlreadySet) {
    action = {
      calledFrom: callerInfo.from,
      name: callerInfo.name,
      handler: async () => {
        const pipeline = Reflect.get(context, pipelineSymbol);
        const callerInfoName = shouldAppendForwardSlash(
          pipeline.manifest.trailingSlash,
          pipeline.manifest.buildFormat
        ) ? removeTrailingForwardSlash(callerInfo.name) : callerInfo.name;
        let baseAction;
        try {
          baseAction = await pipeline.getAction(callerInfoName);
        } catch (error) {
          if (error instanceof Error && "name" in error && typeof error.name === "string" && error.name === ActionNotFoundError.name) {
            return { data: void 0, error: new ActionError({ code: "NOT_FOUND" }) };
          }
          throw error;
        }
        const bodySizeLimit = pipeline.manifest.actionBodySizeLimit;
        let input;
        try {
          input = await parseRequestBody(context.request, bodySizeLimit);
        } catch (e) {
          if (e instanceof ActionError) {
            return { data: void 0, error: e };
          }
          if (e instanceof TypeError) {
            return { data: void 0, error: new ActionError({ code: "UNSUPPORTED_MEDIA_TYPE" }) };
          }
          throw e;
        }
        const omitKeys = ["props", "getActionResult", "callAction", "redirect"];
        const actionAPIContext = Object.create(
          Object.getPrototypeOf(context),
          Object.fromEntries(
            Object.entries(Object.getOwnPropertyDescriptors(context)).filter(
              ([key]) => !omitKeys.includes(key)
            )
          )
        );
        Reflect.set(actionAPIContext, ACTION_API_CONTEXT_SYMBOL, true);
        const handler = baseAction.bind(actionAPIContext);
        return handler(input);
      }
    };
  }
  function setActionResult(actionName, actionResult) {
    context.locals._actionPayload = {
      actionResult,
      actionName
    };
  }
  return {
    action,
    setActionResult,
    serializeActionResult,
    deserializeActionResult
  };
}
function getCallerInfo(ctx) {
  if (ctx.routePattern === ACTION_RPC_ROUTE_PATTERN) {
    return { from: "rpc", name: ctx.url.pathname.replace(/^.*\/_actions\//, "") };
  }
  const queryParam = ctx.url.searchParams.get(ACTION_QUERY_PARAMS.actionName);
  if (queryParam) {
    return { from: "form", name: queryParam };
  }
  return void 0;
}
async function parseRequestBody(request, bodySizeLimit) {
  const contentType = request.headers.get("content-type");
  const contentLengthHeader = request.headers.get("content-length");
  const contentLength = contentLengthHeader ? Number.parseInt(contentLengthHeader, 10) : void 0;
  const hasContentLength = typeof contentLength === "number" && Number.isFinite(contentLength);
  if (!contentType) return void 0;
  if (hasContentLength && contentLength > bodySizeLimit) {
    throw new ActionError({
      code: "CONTENT_TOO_LARGE",
      message: `Request body exceeds ${bodySizeLimit} bytes`
    });
  }
  try {
    if (hasContentType(contentType, formContentTypes)) {
      if (!hasContentLength) {
        const body = await readBodyWithLimit(request.clone(), bodySizeLimit);
        const formRequest = new Request(request.url, {
          method: request.method,
          headers: request.headers,
          body: toArrayBuffer(body)
        });
        return await formRequest.formData();
      }
      return await request.clone().formData();
    }
    if (hasContentType(contentType, ["application/json"])) {
      if (contentLength === 0) return void 0;
      if (!hasContentLength) {
        const body = await readBodyWithLimit(request.clone(), bodySizeLimit);
        if (body.byteLength === 0) return void 0;
        return JSON.parse(new TextDecoder().decode(body));
      }
      return await request.clone().json();
    }
  } catch (e) {
    if (e instanceof BodySizeLimitError) {
      throw new ActionError({
        code: "CONTENT_TOO_LARGE",
        message: `Request body exceeds ${bodySizeLimit} bytes`
      });
    }
    throw e;
  }
  throw new TypeError("Unsupported content type");
}
const ACTION_API_CONTEXT_SYMBOL = /* @__PURE__ */ Symbol.for("astro.actionAPIContext");
const formContentTypes = ["application/x-www-form-urlencoded", "multipart/form-data"];
function hasContentType(contentType, expected) {
  const type = contentType.split(";")[0].toLowerCase();
  return expected.some((t) => type === t);
}
function serializeActionResult(res) {
  if (res.error) {
    if (Object.assign(__vite_import_meta_env__, { _: "/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/node_modules/.bin/astro" })?.DEV) {
      actionResultErrorStack.set(res.error.stack);
    }
    let body2;
    if (res.error instanceof ActionInputError) {
      body2 = {
        type: res.error.type,
        issues: res.error.issues,
        fields: res.error.fields
      };
    } else {
      body2 = {
        ...res.error,
        message: res.error.message
      };
    }
    return {
      type: "error",
      status: res.error.status,
      contentType: "application/json",
      body: JSON.stringify(body2)
    };
  }
  if (res.data === void 0) {
    return {
      type: "empty",
      status: 204
    };
  }
  let body;
  try {
    body = stringify$1(res.data, {
      // Add support for URL objects
      URL: (value) => value instanceof URL && value.href
    });
  } catch (e) {
    let hint = ActionsReturnedInvalidDataError.hint;
    if (res.data instanceof Response) {
      hint = REDIRECT_STATUS_CODES.includes(res.data.status) ? "If you need to redirect when the action succeeds, trigger a redirect where the action is called. See the Actions guide for server and client redirect examples: https://docs.astro.build/en/guides/actions." : "If you need to return a Response object, try using a server endpoint instead. See https://docs.astro.build/en/guides/endpoints/#server-endpoints-api-routes";
    }
    throw new AstroError({
      ...ActionsReturnedInvalidDataError,
      message: ActionsReturnedInvalidDataError.message(String(e)),
      hint
    });
  }
  return {
    type: "data",
    status: 200,
    contentType: "application/json+devalue",
    body
  };
}
function toArrayBuffer(buffer) {
  const copy = new Uint8Array(buffer.byteLength);
  copy.set(buffer);
  return copy.buffer;
}

function hasActionPayload(locals) {
  return "_actionPayload" in locals;
}
function createGetActionResult(locals) {
  return (actionFn) => {
    if (!hasActionPayload(locals) || actionFn.toString() !== getActionQueryString(locals._actionPayload.actionName)) {
      return void 0;
    }
    return deserializeActionResult(locals._actionPayload.actionResult);
  };
}
function createCallAction(context) {
  return (baseAction, input) => {
    Reflect.set(context, ACTION_API_CONTEXT_SYMBOL, true);
    const action = baseAction.bind(context);
    return action(input);
  };
}

const DELETED_EXPIRATION = /* @__PURE__ */ new Date(0);
const DELETED_VALUE = "deleted";
const responseSentSymbol = /* @__PURE__ */ Symbol.for("astro.responseSent");
const identity = (value) => value;
class AstroCookie {
  value;
  constructor(value) {
    this.value = value;
  }
  json() {
    if (this.value === void 0) {
      throw new Error(`Cannot convert undefined to an object.`);
    }
    return JSON.parse(this.value);
  }
  number() {
    return Number(this.value);
  }
  boolean() {
    if (this.value === "false") return false;
    if (this.value === "0") return false;
    return Boolean(this.value);
  }
}
class AstroCookies {
  #request;
  #requestValues;
  #outgoing;
  #consumed;
  constructor(request) {
    this.#request = request;
    this.#requestValues = null;
    this.#outgoing = null;
    this.#consumed = false;
  }
  /**
   * Astro.cookies.delete(key) is used to delete a cookie. Using this method will result
   * in a Set-Cookie header added to the response.
   * @param key The cookie to delete
   * @param options Options related to this deletion, such as the path of the cookie.
   */
  delete(key, options) {
    const {
      // @ts-expect-error
      maxAge: _ignoredMaxAge,
      // @ts-expect-error
      expires: _ignoredExpires,
      ...sanitizedOptions
    } = options || {};
    const serializeOptions = {
      expires: DELETED_EXPIRATION,
      ...sanitizedOptions
    };
    this.#ensureOutgoingMap().set(key, [
      DELETED_VALUE,
      serialize(key, DELETED_VALUE, serializeOptions),
      false
    ]);
  }
  /**
   * Astro.cookies.get(key) is used to get a cookie value. The cookie value is read from the
   * request. If you have set a cookie via Astro.cookies.set(key, value), the value will be taken
   * from that set call, overriding any values already part of the request.
   * @param key The cookie to get.
   * @returns An object containing the cookie value as well as convenience methods for converting its value.
   */
  get(key, options = void 0) {
    if (this.#outgoing?.has(key)) {
      let [serializedValue, , isSetValue] = this.#outgoing.get(key);
      if (isSetValue) {
        return new AstroCookie(serializedValue);
      } else {
        return void 0;
      }
    }
    const decode = options?.decode ?? decodeURIComponent;
    const values = this.#ensureParsed();
    if (key in values) {
      const value = values[key];
      if (value) {
        let decodedValue;
        try {
          decodedValue = decode(value);
        } catch (_error) {
          decodedValue = value;
        }
        return new AstroCookie(decodedValue);
      }
    }
  }
  /**
   * Astro.cookies.has(key) returns a boolean indicating whether this cookie is either
   * part of the initial request or set via Astro.cookies.set(key)
   * @param key The cookie to check for.
   * @param _options This parameter is no longer used.
   * @returns
   */
  has(key, _options) {
    if (this.#outgoing?.has(key)) {
      let [, , isSetValue] = this.#outgoing.get(key);
      return isSetValue;
    }
    const values = this.#ensureParsed();
    return values[key] !== void 0;
  }
  /**
   * Astro.cookies.set(key, value) is used to set a cookie's value. If provided
   * an object it will be stringified via JSON.stringify(value). Additionally you
   * can provide options customizing how this cookie will be set, such as setting httpOnly
   * in order to prevent the cookie from being read in client-side JavaScript.
   * @param key The name of the cookie to set.
   * @param value A value, either a string or other primitive or an object.
   * @param options Options for the cookie, such as the path and security settings.
   */
  set(key, value, options) {
    if (this.#consumed) {
      const warning = new Error(
        "Astro.cookies.set() was called after the cookies had already been sent to the browser.\nThis may have happened if this method was called in an imported component.\nPlease make sure that Astro.cookies.set() is only called in the frontmatter of the main page."
      );
      warning.name = "Warning";
      console.warn(warning);
    }
    let serializedValue;
    if (typeof value === "string") {
      serializedValue = value;
    } else {
      let toStringValue = value.toString();
      if (toStringValue === Object.prototype.toString.call(value)) {
        serializedValue = JSON.stringify(value);
      } else {
        serializedValue = toStringValue;
      }
    }
    const serializeOptions = {};
    if (options) {
      Object.assign(serializeOptions, options);
    }
    this.#ensureOutgoingMap().set(key, [
      serializedValue,
      serialize(key, serializedValue, serializeOptions),
      true
    ]);
    if (this.#request[responseSentSymbol]) {
      throw new AstroError({
        ...ResponseSentError
      });
    }
  }
  /**
   * Merges a new AstroCookies instance into the current instance. Any new cookies
   * will be added to the current instance, overwriting any existing cookies with the same name.
   */
  merge(cookies) {
    const outgoing = cookies.#outgoing;
    if (outgoing) {
      for (const [key, value] of outgoing) {
        this.#ensureOutgoingMap().set(key, value);
      }
    }
  }
  /**
   * Astro.cookies.header() returns an iterator for the cookies that have previously
   * been set by either Astro.cookies.set() or Astro.cookies.delete().
   * This method is primarily used by adapters to set the header on outgoing responses.
   * @returns
   */
  *headers() {
    if (this.#outgoing == null) return;
    for (const [, value] of this.#outgoing) {
      yield value[1];
    }
  }
  /**
   * Marks the cookies as consumed and returns the header values.
   * After consumption, any subsequent `set()` calls will warn.
   */
  consume() {
    this.#consumed = true;
    return this.headers();
  }
  /**
   * @deprecated Use the instance method `cookies.consume()` instead.
   * Kept for backward compatibility with adapters.
   */
  static consume(cookies) {
    return cookies.consume();
  }
  #ensureParsed() {
    if (!this.#requestValues) {
      this.#parse();
    }
    if (!this.#requestValues) {
      this.#requestValues = /* @__PURE__ */ Object.create(null);
    }
    return this.#requestValues;
  }
  #ensureOutgoingMap() {
    if (!this.#outgoing) {
      this.#outgoing = /* @__PURE__ */ new Map();
    }
    return this.#outgoing;
  }
  #parse() {
    const raw = this.#request.headers.get("cookie");
    if (!raw) {
      return;
    }
    this.#requestValues = parse$1(raw, { decode: identity });
  }
}

const astroCookiesSymbol = /* @__PURE__ */ Symbol.for("astro.cookies");
function attachCookiesToResponse(response, cookies) {
  Reflect.set(response, astroCookiesSymbol, cookies);
}
function getCookiesFromResponse(response) {
  let cookies = Reflect.get(response, astroCookiesSymbol);
  if (cookies != null) {
    return cookies;
  } else {
    return void 0;
  }
}
function* getSetCookiesFromResponse(response) {
  const cookies = getCookiesFromResponse(response);
  if (!cookies) {
    return [];
  }
  for (const headerValue of cookies.consume()) {
    yield headerValue;
  }
  return [];
}

const NOOP_ACTIONS_MOD = {
  server: {}
};

function defineMiddleware(fn) {
  return fn;
}

const FORM_CONTENT_TYPES = [
  "application/x-www-form-urlencoded",
  "multipart/form-data",
  "text/plain"
];
const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];
function createOriginCheckMiddleware() {
  return defineMiddleware((context, next) => {
    const { request, url, isPrerendered } = context;
    if (isPrerendered) {
      return next();
    }
    if (SAFE_METHODS.includes(request.method)) {
      return next();
    }
    const isSameOrigin = request.headers.get("origin") === url.origin;
    const hasContentType = request.headers.has("content-type");
    if (hasContentType) {
      const formLikeHeader = hasFormLikeHeader(request.headers.get("content-type"));
      if (formLikeHeader && !isSameOrigin) {
        return new Response(`Cross-site ${request.method} form submissions are forbidden`, {
          status: 403
        });
      }
    } else {
      if (!isSameOrigin) {
        return new Response(`Cross-site ${request.method} form submissions are forbidden`, {
          status: 403
        });
      }
    }
    return next();
  });
}
function hasFormLikeHeader(contentType) {
  if (contentType) {
    for (const FORM_CONTENT_TYPE of FORM_CONTENT_TYPES) {
      if (contentType.toLowerCase().includes(FORM_CONTENT_TYPE)) {
        return true;
      }
    }
  }
  return false;
}

const NOOP_MIDDLEWARE_FN = async (_ctx, next) => {
  const response = await next();
  response.headers.set(NOOP_MIDDLEWARE_HEADER, "true");
  return response;
};

function createRequest({
  url,
  headers,
  method = "GET",
  body = void 0,
  logger,
  isPrerendered = false,
  routePattern,
  init
}) {
  const headersObj = isPrerendered ? void 0 : headers instanceof Headers ? headers : new Headers(
    // Filter out HTTP/2 pseudo-headers. These are internally-generated headers added to all HTTP/2 requests with trusted metadata about the request.
    // Examples include `:method`, `:scheme`, `:authority`, and `:path`.
    // They are always prefixed with a colon to distinguish them from other headers, and it is an error to add the to a Headers object manually.
    // See https://httpwg.org/specs/rfc7540.html#HttpRequest
    Object.entries(headers).filter(([name]) => !name.startsWith(":"))
  );
  if (typeof url === "string") url = new URL(url);
  if (isPrerendered) {
    url.search = "";
  }
  const request = new Request(url, {
    method,
    headers: headersObj,
    // body is made available only if the request is for a page that will be on-demand rendered
    body: isPrerendered ? null : body,
    ...init
  });
  if (isPrerendered) {
    let _headers = request.headers;
    const { value, writable, ...headersDesc } = Object.getOwnPropertyDescriptor(request, "headers") || {};
    Object.defineProperty(request, "headers", {
      ...headersDesc,
      get() {
        logger.warn(
          null,
          `\`Astro.request.headers\` was used when rendering the route \`${routePattern}'\`. \`Astro.request.headers\` is not available on prerendered pages. If you need access to request headers, make sure that the page is server-rendered using \`export const prerender = false;\` or by setting \`output\` to \`"server"\` in your Astro config to make all your pages server-rendered by default.`
        );
        return _headers;
      },
      set(newHeaders) {
        _headers = newHeaders;
      }
    });
  }
  return request;
}

function template({
  title,
  pathname,
  statusCode = 404,
  tabTitle,
  body
}) {
  return `<!doctype html>
<html lang="en">
	<head>
		<meta charset="UTF-8">
		<title>${tabTitle}</title>
		<style>
			:root {
				--gray-10: hsl(258, 7%, 10%);
				--gray-20: hsl(258, 7%, 20%);
				--gray-30: hsl(258, 7%, 30%);
				--gray-40: hsl(258, 7%, 40%);
				--gray-50: hsl(258, 7%, 50%);
				--gray-60: hsl(258, 7%, 60%);
				--gray-70: hsl(258, 7%, 70%);
				--gray-80: hsl(258, 7%, 80%);
				--gray-90: hsl(258, 7%, 90%);
				--black: #13151A;
				--accent-light: #E0CCFA;
			}

			* {
				box-sizing: border-box;
			}

			html {
				background: var(--black);
				color-scheme: dark;
				accent-color: var(--accent-light);
			}

			body {
				background-color: var(--gray-10);
				color: var(--gray-80);
				font-family: ui-monospace, Menlo, Monaco, "Cascadia Mono", "Segoe UI Mono", "Roboto Mono", "Oxygen Mono", "Ubuntu Monospace", "Source Code Pro", "Fira Mono", "Droid Sans Mono", "Courier New", monospace;
				line-height: 1.5;
				margin: 0;
			}

			a {
				color: var(--accent-light);
			}

			.center {
				display: flex;
				flex-direction: column;
				justify-content: center;
				align-items: center;
				height: 100vh;
				width: 100vw;
			}

			h1 {
				margin-bottom: 8px;
				color: white;
				font-family: system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
				font-weight: 700;
				margin-top: 1rem;
				margin-bottom: 0;
			}

			.statusCode {
				color: var(--accent-light);
			}

			.astro-icon {
				height: 124px;
				width: 124px;
			}

			pre, code {
				padding: 2px 8px;
				background: rgba(0,0,0, 0.25);
				border: 1px solid rgba(255,255,255, 0.25);
				border-radius: 4px;
				font-size: 1.2em;
				margin-top: 0;
				max-width: 60em;
			}
		</style>
	</head>
	<body>
		<main class="center">
			<svg class="astro-icon" xmlns="http://www.w3.org/2000/svg" width="64" height="80" viewBox="0 0 64 80" fill="none"> <path d="M20.5253 67.6322C16.9291 64.3531 15.8793 57.4632 17.3776 52.4717C19.9755 55.6188 23.575 56.6157 27.3035 57.1784C33.0594 58.0468 38.7122 57.722 44.0592 55.0977C44.6709 54.7972 45.2362 54.3978 45.9045 53.9931C46.4062 55.4451 46.5368 56.9109 46.3616 58.4028C45.9355 62.0362 44.1228 64.8429 41.2397 66.9705C40.0868 67.8215 38.8669 68.5822 37.6762 69.3846C34.0181 71.8508 33.0285 74.7426 34.403 78.9491C34.4357 79.0516 34.4649 79.1541 34.5388 79.4042C32.6711 78.5705 31.3069 77.3565 30.2674 75.7604C29.1694 74.0757 28.6471 72.2121 28.6196 70.1957C28.6059 69.2144 28.6059 68.2244 28.4736 67.257C28.1506 64.8985 27.0406 63.8425 24.9496 63.7817C22.8036 63.7192 21.106 65.0426 20.6559 67.1268C20.6215 67.2865 20.5717 67.4446 20.5218 67.6304L20.5253 67.6322Z" fill="white"/> <path d="M20.5253 67.6322C16.9291 64.3531 15.8793 57.4632 17.3776 52.4717C19.9755 55.6188 23.575 56.6157 27.3035 57.1784C33.0594 58.0468 38.7122 57.722 44.0592 55.0977C44.6709 54.7972 45.2362 54.3978 45.9045 53.9931C46.4062 55.4451 46.5368 56.9109 46.3616 58.4028C45.9355 62.0362 44.1228 64.8429 41.2397 66.9705C40.0868 67.8215 38.8669 68.5822 37.6762 69.3846C34.0181 71.8508 33.0285 74.7426 34.403 78.9491C34.4357 79.0516 34.4649 79.1541 34.5388 79.4042C32.6711 78.5705 31.3069 77.3565 30.2674 75.7604C29.1694 74.0757 28.6471 72.2121 28.6196 70.1957C28.6059 69.2144 28.6059 68.2244 28.4736 67.257C28.1506 64.8985 27.0406 63.8425 24.9496 63.7817C22.8036 63.7192 21.106 65.0426 20.6559 67.1268C20.6215 67.2865 20.5717 67.4446 20.5218 67.6304L20.5253 67.6322Z" fill="url(#paint0_linear_738_686)"/> <path d="M0 51.6401C0 51.6401 10.6488 46.4654 21.3274 46.4654L29.3786 21.6102C29.6801 20.4082 30.5602 19.5913 31.5538 19.5913C32.5474 19.5913 33.4275 20.4082 33.7289 21.6102L41.7802 46.4654C54.4274 46.4654 63.1076 51.6401 63.1076 51.6401C63.1076 51.6401 45.0197 2.48776 44.9843 2.38914C44.4652 0.935933 43.5888 0 42.4073 0H20.7022C19.5206 0 18.6796 0.935933 18.1251 2.38914C18.086 2.4859 0 51.6401 0 51.6401Z" fill="white"/> <defs> <linearGradient id="paint0_linear_738_686" x1="31.554" y1="75.4423" x2="39.7462" y2="48.376" gradientUnits="userSpaceOnUse"> <stop stop-color="#D83333"/> <stop offset="1" stop-color="#F041FF"/> </linearGradient> </defs> </svg>
			<h1>${statusCode ? `<span class="statusCode">${statusCode}: </span> ` : ""}<span class="statusMessage">${title}</span></h1>
			${body || `
				<pre>Path: ${escape(pathname)}</pre>
			`}
			</main>
	</body>
</html>`;
}

const DEFAULT_404_ROUTE = {
  component: DEFAULT_404_COMPONENT,
  params: [],
  pattern: /^\/404\/?$/,
  prerender: false,
  pathname: "/404",
  segments: [[{ content: "404", dynamic: false, spread: false }]],
  type: "page",
  route: "/404",
  fallbackRoutes: [],
  isIndex: false,
  origin: "internal",
  distURL: []
};
async function default404Page({ pathname }) {
  return new Response(
    template({
      statusCode: 404,
      title: "Not found",
      tabTitle: "404: Not Found",
      pathname
    }),
    { status: 404, headers: { "Content-Type": "text/html" } }
  );
}
default404Page.isAstroComponentFactory = true;
const default404Instance = {
  default: default404Page
};

const ROUTE404_RE = /^\/404\/?$/;
const ROUTE500_RE = /^\/500\/?$/;
function isRoute404(route) {
  return ROUTE404_RE.test(route);
}
function isRoute500(route) {
  return ROUTE500_RE.test(route);
}

function findRouteToRewrite({
  payload,
  routes,
  request,
  trailingSlash,
  buildFormat,
  base,
  outDir
}) {
  let newUrl = void 0;
  if (payload instanceof URL) {
    newUrl = payload;
  } else if (payload instanceof Request) {
    newUrl = new URL(payload.url);
  } else {
    newUrl = new URL(collapseDuplicateSlashes(payload), new URL(request.url).origin);
  }
  const { pathname, resolvedUrlPathname } = normalizeRewritePathname(
    newUrl.pathname,
    base,
    trailingSlash,
    buildFormat
  );
  newUrl.pathname = resolvedUrlPathname;
  const decodedPathname = decodeURI(pathname);
  if (isRoute404(decodedPathname)) {
    const errorRoute = routes.find((route) => route.route === "/404");
    if (errorRoute) {
      return { routeData: errorRoute, newUrl, pathname: decodedPathname };
    }
  }
  if (isRoute500(decodedPathname)) {
    const errorRoute = routes.find((route) => route.route === "/500");
    if (errorRoute) {
      return { routeData: errorRoute, newUrl, pathname: decodedPathname };
    }
  }
  let foundRoute;
  for (const route of routes) {
    if (route.pattern.test(decodedPathname)) {
      if (route.params && route.params.length !== 0 && route.distURL && route.distURL.length !== 0) {
        if (!route.distURL.find(
          (url) => url.href.replace(outDir.toString(), "").replace(/(?:\/index\.html|\.html)$/, "") === trimSlashes(pathname)
        )) {
          continue;
        }
      }
      foundRoute = route;
      break;
    }
  }
  if (foundRoute) {
    return {
      routeData: foundRoute,
      newUrl,
      pathname: decodedPathname
    };
  } else {
    const custom404 = routes.find((route) => route.route === "/404");
    if (custom404) {
      return { routeData: custom404, newUrl, pathname };
    } else {
      return { routeData: DEFAULT_404_ROUTE, newUrl, pathname };
    }
  }
}
function copyRequest(newUrl, oldRequest, isPrerendered, logger, routePattern) {
  if (oldRequest.bodyUsed) {
    throw new AstroError(RewriteWithBodyUsed);
  }
  return createRequest({
    url: newUrl,
    method: oldRequest.method,
    body: oldRequest.body,
    isPrerendered,
    logger,
    headers: isPrerendered ? {} : oldRequest.headers,
    routePattern,
    init: {
      referrer: oldRequest.referrer,
      referrerPolicy: oldRequest.referrerPolicy,
      mode: oldRequest.mode,
      credentials: oldRequest.credentials,
      cache: oldRequest.cache,
      redirect: oldRequest.redirect,
      integrity: oldRequest.integrity,
      signal: oldRequest.signal,
      keepalive: oldRequest.keepalive,
      // https://fetch.spec.whatwg.org/#dom-request-duplex
      // @ts-expect-error It isn't part of the types, but undici accepts it and it allows to carry over the body to a new request
      duplex: "half"
    }
  });
}
function setOriginPathname(request, pathname, trailingSlash, buildFormat) {
  if (!pathname) {
    pathname = "/";
  }
  const shouldAppendSlash = shouldAppendForwardSlash(trailingSlash, buildFormat);
  let finalPathname;
  if (pathname === "/") {
    finalPathname = "/";
  } else if (shouldAppendSlash) {
    finalPathname = appendForwardSlash(pathname);
  } else {
    finalPathname = removeTrailingForwardSlash(pathname);
  }
  Reflect.set(request, originPathnameSymbol, encodeURIComponent(finalPathname));
}
function getOriginPathname(request) {
  const origin = Reflect.get(request, originPathnameSymbol);
  if (origin) {
    return decodeURIComponent(origin);
  }
  return new URL(request.url).pathname;
}
function normalizeRewritePathname(urlPathname, base, trailingSlash, buildFormat) {
  let pathname = collapseDuplicateSlashes(urlPathname);
  const shouldAppendSlash = shouldAppendForwardSlash(trailingSlash, buildFormat);
  if (base !== "/") {
    const isBasePathRequest = urlPathname === base || urlPathname === removeTrailingForwardSlash(base);
    if (isBasePathRequest) {
      pathname = "/";
    } else if (urlPathname.startsWith(base)) {
      pathname = shouldAppendSlash ? appendForwardSlash(urlPathname) : removeTrailingForwardSlash(urlPathname);
      pathname = pathname.slice(base.length);
    }
  }
  if (!pathname.startsWith("/") && shouldAppendSlash && urlPathname.endsWith("/")) {
    pathname = prependForwardSlash(pathname);
  }
  if (buildFormat === "file") {
    pathname = pathname.replace(/\.html$/, "");
  }
  let resolvedUrlPathname;
  if (base !== "/" && (pathname === "" || pathname === "/") && !shouldAppendSlash) {
    resolvedUrlPathname = removeTrailingForwardSlash(base);
  } else {
    resolvedUrlPathname = joinPaths(...[base, pathname].filter(Boolean));
  }
  return { pathname, resolvedUrlPathname };
}

function sequence(...handlers) {
  const filtered = handlers.filter((h) => !!h);
  const length = filtered.length;
  if (!length) {
    return defineMiddleware((_context, next) => {
      return next();
    });
  }
  return defineMiddleware((context, next) => {
    let carriedPayload = void 0;
    return applyHandle(0, context);
    function applyHandle(i, handleContext) {
      const handle = filtered[i];
      const result = handle(handleContext, async (payload) => {
        if (i < length - 1) {
          if (payload) {
            let newRequest;
            if (payload instanceof Request) {
              newRequest = payload;
            } else if (payload instanceof URL) {
              newRequest = new Request(payload, handleContext.request.clone());
            } else {
              newRequest = new Request(
                new URL(payload, handleContext.url.origin),
                handleContext.request.clone()
              );
            }
            const oldPathname = handleContext.url.pathname;
            const pipeline = Reflect.get(handleContext, pipelineSymbol);
            const { routeData, pathname } = await pipeline.tryRewrite(
              payload,
              handleContext.request
            );
            if (pipeline.manifest.serverLike === true && handleContext.isPrerendered === false && routeData.prerender === true) {
              throw new AstroError({
                ...ForbiddenRewrite,
                message: ForbiddenRewrite.message(
                  handleContext.url.pathname,
                  pathname,
                  routeData.component
                ),
                hint: ForbiddenRewrite.hint(routeData.component)
              });
            }
            carriedPayload = payload;
            handleContext.request = newRequest;
            handleContext.url = new URL(newRequest.url);
            handleContext.params = getParams(routeData, pathname);
            handleContext.routePattern = routeData.route;
            setOriginPathname(
              handleContext.request,
              oldPathname,
              pipeline.manifest.trailingSlash,
              pipeline.manifest.buildFormat
            );
          }
          return applyHandle(i + 1, handleContext);
        } else {
          return next(payload ?? carriedPayload);
        }
      });
      return result;
    }
  });
}

const RedirectComponentInstance = {
  default() {
    return new Response(null, {
      status: 301
    });
  }
};
const RedirectSinglePageBuiltModule = {
  page: () => Promise.resolve(RedirectComponentInstance),
  onRequest: (_, next) => next()
};

function sanitizeParams(params) {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => {
      if (typeof value === "string") {
        return [key, value.normalize().replace(/#/g, "%23").replace(/\?/g, "%3F")];
      }
      return [key, value];
    })
  );
}
function getParameter(part, params) {
  if (part.spread) {
    return params[part.content.slice(3)] || "";
  }
  if (part.dynamic) {
    if (!params[part.content]) {
      throw new TypeError(`Missing parameter: ${part.content}`);
    }
    return params[part.content];
  }
  return part.content.normalize().replace(/\?/g, "%3F").replace(/#/g, "%23").replace(/%5B/g, "[").replace(/%5D/g, "]");
}
function getSegment(segment, params) {
  const segmentPath = segment.map((part) => getParameter(part, params)).join("");
  return segmentPath ? collapseDuplicateLeadingSlashes("/" + segmentPath) : "";
}
function getRouteGenerator(segments, addTrailingSlash) {
  return (params) => {
    const sanitizedParams = sanitizeParams(params);
    let trailing = "";
    if (addTrailingSlash === "always" && segments.length) {
      trailing = "/";
    }
    const path = segments.map((segment) => getSegment(segment, sanitizedParams)).join("") + trailing;
    return path || "/";
  };
}

const VALID_PARAM_TYPES = ["string", "undefined"];
function validateGetStaticPathsParameter([key, value], route) {
  if (!VALID_PARAM_TYPES.includes(typeof value)) {
    throw new AstroError({
      ...GetStaticPathsInvalidRouteParam,
      message: GetStaticPathsInvalidRouteParam.message(key, value, typeof value),
      location: {
        file: route
      }
    });
  }
}

function stringifyParams(params, route, trailingSlash) {
  const validatedParams = {};
  for (const [key, value] of Object.entries(params)) {
    validateGetStaticPathsParameter([key, value], route.component);
    if (value !== void 0) {
      validatedParams[key] = trimSlashes(value);
    }
  }
  return getRouteGenerator(route.segments, trailingSlash)(validatedParams);
}

function validateDynamicRouteModule(mod, {
  ssr,
  route
}) {
  if ((!ssr || route.prerender) && !mod.getStaticPaths) {
    throw new AstroError({
      ...GetStaticPathsRequired,
      location: { file: route.component }
    });
  }
}
function validateGetStaticPathsResult(result, route) {
  if (!Array.isArray(result)) {
    throw new AstroError({
      ...InvalidGetStaticPathsReturn,
      message: InvalidGetStaticPathsReturn.message(typeof result),
      location: {
        file: route.component
      }
    });
  }
  result.forEach((pathObject) => {
    if (typeof pathObject === "object" && Array.isArray(pathObject) || pathObject === null) {
      throw new AstroError({
        ...InvalidGetStaticPathsEntry,
        message: InvalidGetStaticPathsEntry.message(
          Array.isArray(pathObject) ? "array" : typeof pathObject
        )
      });
    }
    if (pathObject.params === void 0 || pathObject.params === null || pathObject.params && Object.keys(pathObject.params).length === 0) {
      throw new AstroError({
        ...GetStaticPathsExpectedParams,
        location: {
          file: route.component
        }
      });
    }
  });
}

function generatePaginateFunction(routeMatch, base, trailingSlash) {
  return function paginateUtility(data, args = {}) {
    const generate = getRouteGenerator(routeMatch.segments, trailingSlash);
    let { pageSize: _pageSize, params: _params, props: _props } = args;
    const pageSize = _pageSize || 10;
    const paramName = "page";
    const additionalParams = _params || {};
    const additionalProps = _props || {};
    let includesFirstPageNumber;
    if (routeMatch.params.includes(`...${paramName}`)) {
      includesFirstPageNumber = false;
    } else if (routeMatch.params.includes(`${paramName}`)) {
      includesFirstPageNumber = true;
    } else {
      throw new AstroError({
        ...PageNumberParamNotFound,
        message: PageNumberParamNotFound.message(paramName)
      });
    }
    const lastPage = Math.max(1, Math.ceil(data.length / pageSize));
    const result = [...Array(lastPage).keys()].map((num) => {
      const pageNum = num + 1;
      const start = pageSize === Number.POSITIVE_INFINITY ? 0 : (pageNum - 1) * pageSize;
      const end = Math.min(start + pageSize, data.length);
      const params = {
        ...additionalParams,
        [paramName]: includesFirstPageNumber || pageNum > 1 ? String(pageNum) : void 0
      };
      const current = addRouteBase(generate({ ...params }), base);
      const next = pageNum === lastPage ? void 0 : addRouteBase(generate({ ...params, page: String(pageNum + 1) }), base);
      const prev = pageNum === 1 ? void 0 : addRouteBase(
        generate({
          ...params,
          page: !includesFirstPageNumber && pageNum - 1 === 1 ? void 0 : String(pageNum - 1)
        }),
        base
      );
      const first = pageNum === 1 ? void 0 : addRouteBase(
        generate({
          ...params,
          page: includesFirstPageNumber ? "1" : void 0
        }),
        base
      );
      const last = pageNum === lastPage ? void 0 : addRouteBase(generate({ ...params, page: String(lastPage) }), base);
      return {
        params,
        props: {
          ...additionalProps,
          page: {
            data: data.slice(start, end),
            start,
            end: end - 1,
            size: pageSize,
            total: data.length,
            currentPage: pageNum,
            lastPage,
            url: { current, next, prev, first, last }
          }
        }
      };
    });
    return result;
  };
}
function addRouteBase(route, base) {
  let routeWithBase = joinPaths(base, route);
  if (routeWithBase === "") routeWithBase = "/";
  return routeWithBase;
}

async function callGetStaticPaths({
  mod,
  route,
  routeCache,
  ssr,
  base,
  trailingSlash
}) {
  const cached = routeCache.get(route);
  if (!mod) {
    throw new Error("This is an error caused by Astro and not your code. Please file an issue.");
  }
  if (cached?.staticPaths) {
    return cached.staticPaths;
  }
  validateDynamicRouteModule(mod, { ssr, route });
  if (ssr && !route.prerender) {
    const entry = Object.assign([], { keyed: /* @__PURE__ */ new Map() });
    routeCache.set(route, { ...cached, staticPaths: entry });
    return entry;
  }
  let staticPaths = [];
  if (!mod.getStaticPaths) {
    throw new Error("Unexpected Error.");
  }
  staticPaths = await mod.getStaticPaths({
    // Q: Why the cast?
    // A: So users downstream can have nicer typings, we have to make some sacrifice in our internal typings, which necessitate a cast here
    paginate: generatePaginateFunction(route, base, trailingSlash),
    routePattern: route.route
  });
  validateGetStaticPathsResult(staticPaths, route);
  const keyedStaticPaths = staticPaths;
  keyedStaticPaths.keyed = /* @__PURE__ */ new Map();
  for (const sp of keyedStaticPaths) {
    const paramsKey = stringifyParams(sp.params, route, trailingSlash);
    keyedStaticPaths.keyed.set(paramsKey, sp);
  }
  routeCache.set(route, { ...cached, staticPaths: keyedStaticPaths });
  return keyedStaticPaths;
}
class RouteCache {
  logger;
  cache = {};
  runtimeMode;
  constructor(logger, runtimeMode = "production") {
    this.logger = logger;
    this.runtimeMode = runtimeMode;
  }
  /** Clear the cache. */
  clearAll() {
    this.cache = {};
  }
  set(route, entry) {
    const key = this.key(route);
    if (this.runtimeMode === "production" && this.cache[key]?.staticPaths) {
      this.logger.warn(null, `Internal Warning: route cache overwritten. (${key})`);
    }
    this.cache[key] = entry;
  }
  get(route) {
    return this.cache[this.key(route)];
  }
  key(route) {
    return `${route.route}_${route.component}`;
  }
}
function findPathItemByKey(staticPaths, params, route, logger, trailingSlash) {
  const paramsKey = stringifyParams(params, route, trailingSlash);
  const matchedStaticPath = staticPaths.keyed.get(paramsKey);
  if (matchedStaticPath) {
    return matchedStaticPath;
  }
  logger.debug("router", `findPathItemByKey() - Unexpected cache miss looking for ${paramsKey}`);
}

async function renderEndpoint(mod, context, isPrerendered, logger) {
  const { request, url } = context;
  const method = request.method.toUpperCase();
  let handler = mod[method] ?? mod["ALL"];
  if (!handler && method === "HEAD" && mod["GET"]) {
    handler = mod["GET"];
  }
  if (isPrerendered && !["GET", "HEAD"].includes(method)) {
    logger.warn(
      "router",
      `${url.pathname} ${colors.bold(
        method
      )} requests are not available in static endpoints. Mark this page as server-rendered (\`export const prerender = false;\`) or update your config to \`output: 'server'\` to make all your pages server-rendered by default.`
    );
  }
  if (handler === void 0) {
    logger.warn(
      "router",
      `No API Route handler exists for the method "${method}" for the route "${url.pathname}".
Found handlers: ${Object.keys(mod).map((exp) => JSON.stringify(exp)).join(", ")}
` + ("all" in mod ? `One of the exported handlers is "all" (lowercase), did you mean to export 'ALL'?
` : "")
    );
    return new Response(null, { status: 404 });
  }
  if (typeof handler !== "function") {
    logger.error(
      "router",
      `The route "${url.pathname}" exports a value for the method "${method}", but it is of the type ${typeof handler} instead of a function.`
    );
    return new Response(null, { status: 500 });
  }
  let response = await handler.call(mod, context);
  if (!response || response instanceof Response === false) {
    throw new AstroError(EndpointDidNotReturnAResponse);
  }
  if (REROUTABLE_STATUS_CODES.includes(response.status)) {
    try {
      response.headers.set(REROUTE_DIRECTIVE_HEADER, "no");
    } catch (err) {
      if (err.message?.includes("immutable")) {
        response = new Response(response.body, response);
        response.headers.set(REROUTE_DIRECTIVE_HEADER, "no");
      } else {
        throw err;
      }
    }
  }
  if (method === "HEAD") {
    return new Response(null, response);
  }
  return response;
}

function isPromise(value) {
  return !!value && typeof value === "object" && "then" in value && typeof value.then === "function";
}
async function* streamAsyncIterator(stream) {
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return;
      yield value;
    }
  } finally {
    reader.releaseLock();
  }
}

const escapeHTML = escape;
function stringifyForScript(value) {
  return JSON.stringify(value)?.replace(/</g, "\\u003c");
}
class HTMLBytes extends Uint8Array {
}
Object.defineProperty(HTMLBytes.prototype, Symbol.toStringTag, {
  get() {
    return "HTMLBytes";
  }
});
const htmlStringSymbol = /* @__PURE__ */ Symbol.for("astro:html-string");
class HTMLString extends String {
  [htmlStringSymbol] = true;
}
const markHTMLString = (value) => {
  if (isHTMLString(value)) {
    return value;
  }
  if (typeof value === "string") {
    return new HTMLString(value);
  }
  return value;
};
function isHTMLString(value) {
  return !!value?.[htmlStringSymbol];
}
function markHTMLBytes(bytes) {
  return new HTMLBytes(bytes);
}
function hasGetReader(obj) {
  return typeof obj.getReader === "function";
}
async function* unescapeChunksAsync(iterable) {
  if (hasGetReader(iterable)) {
    for await (const chunk of streamAsyncIterator(iterable)) {
      yield unescapeHTML(chunk);
    }
  } else {
    for await (const chunk of iterable) {
      yield unescapeHTML(chunk);
    }
  }
}
function* unescapeChunks(iterable) {
  for (const chunk of iterable) {
    yield unescapeHTML(chunk);
  }
}
function unescapeHTML(str) {
  if (!!str && typeof str === "object") {
    if (str instanceof Uint8Array) {
      return markHTMLBytes(str);
    } else if (str instanceof Response && str.body) {
      const body = str.body;
      return unescapeChunksAsync(body);
    } else if (typeof str.then === "function") {
      return Promise.resolve(str).then((value) => {
        return unescapeHTML(value);
      });
    } else if (str[/* @__PURE__ */ Symbol.for("astro:slot-string")]) {
      return str;
    } else if (Symbol.iterator in str) {
      return unescapeChunks(str);
    } else if (Symbol.asyncIterator in str || hasGetReader(str)) {
      return unescapeChunksAsync(str);
    }
  }
  return markHTMLString(str);
}

const AstroJSX = "astro:jsx";
const Empty = /* @__PURE__ */ Symbol("empty");
const toSlotName = (slotAttr) => slotAttr;
function isVNode(vnode) {
  return vnode && typeof vnode === "object" && vnode[AstroJSX];
}
function transformSlots(vnode) {
  if (typeof vnode.type === "string") return vnode;
  const slots = {};
  if (isVNode(vnode.props.children)) {
    const child = vnode.props.children;
    if (!isVNode(child)) return;
    if (!("slot" in child.props)) return;
    const name = toSlotName(child.props.slot);
    slots[name] = [child];
    slots[name]["$$slot"] = true;
    delete child.props.slot;
    delete vnode.props.children;
  } else if (Array.isArray(vnode.props.children)) {
    vnode.props.children = vnode.props.children.map((child) => {
      if (!isVNode(child)) return child;
      if (!("slot" in child.props)) return child;
      const name = toSlotName(child.props.slot);
      if (Array.isArray(slots[name])) {
        slots[name].push(child);
      } else {
        slots[name] = [child];
        slots[name]["$$slot"] = true;
      }
      delete child.props.slot;
      return Empty;
    }).filter((v) => v !== Empty);
  }
  Object.assign(vnode.props, slots);
}
function markRawChildren(child) {
  if (typeof child === "string") return markHTMLString(child);
  if (Array.isArray(child)) return child.map((c) => markRawChildren(c));
  return child;
}
function transformSetDirectives(vnode) {
  if (!("set:html" in vnode.props || "set:text" in vnode.props)) return;
  if ("set:html" in vnode.props) {
    const children = markRawChildren(vnode.props["set:html"]);
    delete vnode.props["set:html"];
    Object.assign(vnode.props, { children });
    return;
  }
  if ("set:text" in vnode.props) {
    const children = vnode.props["set:text"];
    delete vnode.props["set:text"];
    Object.assign(vnode.props, { children });
    return;
  }
}
function createVNode(type, props = {}, key) {
  const vnode = {
    [Renderer]: "astro:jsx",
    [AstroJSX]: true,
    type,
    props
  };
  transformSetDirectives(vnode);
  transformSlots(vnode);
  return vnode;
}

function resolvePropagationHint(input) {
  const explicitHint = input.factoryHint ?? "none";
  if (explicitHint !== "none") {
    return explicitHint;
  }
  if (!input.moduleId) {
    return "none";
  }
  return input.metadataLookup(input.moduleId) ?? "none";
}
function isPropagatingHint(hint) {
  return hint === "self" || hint === "in-tree";
}
function getPropagationHint$1(result, factory) {
  return resolvePropagationHint({
    factoryHint: factory.propagation,
    moduleId: factory.moduleId,
    metadataLookup: (moduleId) => result.componentMetadata.get(moduleId)?.propagation
  });
}

function isAstroComponentFactory(obj) {
  return obj == null ? false : obj.isAstroComponentFactory === true;
}
function isAPropagatingComponent(result, factory) {
  return isPropagatingHint(getPropagationHint(result, factory));
}
function getPropagationHint(result, factory) {
  return getPropagationHint$1(result, factory);
}

const PROP_TYPE = {
  Value: 0,
  JSON: 1,
  // Actually means Array
  RegExp: 2,
  Date: 3,
  Map: 4,
  Set: 5,
  BigInt: 6,
  URL: 7,
  Uint8Array: 8,
  Uint16Array: 9,
  Uint32Array: 10,
  Infinity: 11
};
function serializeArray(value, metadata = {}, parents = /* @__PURE__ */ new WeakSet()) {
  if (parents.has(value)) {
    throw new Error(`Cyclic reference detected while serializing props for <${metadata.displayName} client:${metadata.hydrate}>!

Cyclic references cannot be safely serialized for client-side usage. Please remove the cyclic reference.`);
  }
  parents.add(value);
  const serialized = value.map((v) => {
    return convertToSerializedForm(v, metadata, parents);
  });
  parents.delete(value);
  return serialized;
}
function serializeObject(value, metadata = {}, parents = /* @__PURE__ */ new WeakSet()) {
  if (parents.has(value)) {
    throw new Error(`Cyclic reference detected while serializing props for <${metadata.displayName} client:${metadata.hydrate}>!

Cyclic references cannot be safely serialized for client-side usage. Please remove the cyclic reference.`);
  }
  parents.add(value);
  const serialized = Object.fromEntries(
    Object.entries(value).map(([k, v]) => {
      return [k, convertToSerializedForm(v, metadata, parents)];
    })
  );
  parents.delete(value);
  return serialized;
}
function convertToSerializedForm(value, metadata = {}, parents = /* @__PURE__ */ new WeakSet()) {
  const tag = Object.prototype.toString.call(value);
  switch (tag) {
    case "[object Date]": {
      return [PROP_TYPE.Date, value.toISOString()];
    }
    case "[object RegExp]": {
      return [PROP_TYPE.RegExp, value.source];
    }
    case "[object Map]": {
      return [PROP_TYPE.Map, serializeArray(Array.from(value), metadata, parents)];
    }
    case "[object Set]": {
      return [PROP_TYPE.Set, serializeArray(Array.from(value), metadata, parents)];
    }
    case "[object BigInt]": {
      return [PROP_TYPE.BigInt, value.toString()];
    }
    case "[object URL]": {
      return [PROP_TYPE.URL, value.toString()];
    }
    case "[object Array]": {
      return [PROP_TYPE.JSON, serializeArray(value, metadata, parents)];
    }
    case "[object Uint8Array]": {
      return [PROP_TYPE.Uint8Array, Array.from(value)];
    }
    case "[object Uint16Array]": {
      return [PROP_TYPE.Uint16Array, Array.from(value)];
    }
    case "[object Uint32Array]": {
      return [PROP_TYPE.Uint32Array, Array.from(value)];
    }
    default: {
      if (value !== null && typeof value === "object") {
        return [PROP_TYPE.Value, serializeObject(value, metadata, parents)];
      }
      if (value === Number.POSITIVE_INFINITY) {
        return [PROP_TYPE.Infinity, 1];
      }
      if (value === Number.NEGATIVE_INFINITY) {
        return [PROP_TYPE.Infinity, -1];
      }
      if (value === void 0) {
        return [PROP_TYPE.Value];
      }
      return [PROP_TYPE.Value, value];
    }
  }
}
function serializeProps(props, metadata) {
  const serialized = JSON.stringify(serializeObject(props, metadata));
  return serialized;
}

const transitionDirectivesToCopyOnIsland = Object.freeze([
  "data-astro-transition-scope",
  "data-astro-transition-persist",
  "data-astro-transition-persist-props"
]);
function extractDirectives(inputProps, clientDirectives) {
  let extracted = {
    isPage: false,
    hydration: null,
    props: {},
    propsWithoutTransitionAttributes: {}
  };
  for (const [key, value] of Object.entries(inputProps)) {
    if (key.startsWith("server:")) {
      if (key === "server:root") {
        extracted.isPage = true;
      }
    }
    if (key.startsWith("client:")) {
      if (!extracted.hydration) {
        extracted.hydration = {
          directive: "",
          value: "",
          componentUrl: "",
          componentExport: { value: "" }
        };
      }
      switch (key) {
        case "client:component-path": {
          extracted.hydration.componentUrl = value;
          break;
        }
        case "client:component-export": {
          extracted.hydration.componentExport.value = value;
          break;
        }
        // This is a special prop added to prove that the client hydration method
        // was added statically.
        case "client:component-hydration": {
          break;
        }
        case "client:display-name": {
          break;
        }
        default: {
          extracted.hydration.directive = key.split(":")[1];
          extracted.hydration.value = value;
          if (!clientDirectives.has(extracted.hydration.directive)) {
            const hydrationMethods = Array.from(clientDirectives.keys()).map((d) => `client:${d}`).join(", ");
            throw new Error(
              `Error: invalid hydration directive "${key}". Supported hydration methods: ${hydrationMethods}`
            );
          }
          if (extracted.hydration.directive === "media" && typeof extracted.hydration.value !== "string") {
            throw new AstroError(MissingMediaQueryDirective);
          }
          break;
        }
      }
    } else {
      extracted.props[key] = value;
      if (!transitionDirectivesToCopyOnIsland.includes(key)) {
        extracted.propsWithoutTransitionAttributes[key] = value;
      }
    }
  }
  for (const sym of Object.getOwnPropertySymbols(inputProps)) {
    extracted.props[sym] = inputProps[sym];
    extracted.propsWithoutTransitionAttributes[sym] = inputProps[sym];
  }
  return extracted;
}
async function generateHydrateScript(scriptOptions, metadata) {
  const { renderer, result, astroId, props, attrs } = scriptOptions;
  const { hydrate, componentUrl, componentExport } = metadata;
  if (!componentExport.value) {
    throw new AstroError({
      ...NoMatchingImport,
      message: NoMatchingImport.message(metadata.displayName)
    });
  }
  const island = {
    children: "",
    props: {
      // This is for HMR, probably can avoid it in prod
      uid: astroId
    }
  };
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      island.props[key] = escapeHTML(value);
    }
  }
  island.props["component-url"] = await result.resolve(decodeURI(componentUrl));
  if (renderer.clientEntrypoint) {
    island.props["component-export"] = componentExport.value;
    island.props["renderer-url"] = await result.resolve(
      decodeURI(renderer.clientEntrypoint.toString())
    );
    island.props["props"] = escapeHTML(serializeProps(props, metadata));
  }
  island.props["ssr"] = "";
  island.props["client"] = hydrate;
  let beforeHydrationUrl = await result.resolve("astro:scripts/before-hydration.js");
  if (beforeHydrationUrl.length) {
    island.props["before-hydration-url"] = beforeHydrationUrl;
  }
  island.props["opts"] = escapeHTML(
    JSON.stringify({
      name: metadata.displayName,
      value: metadata.hydrateArgs || ""
    })
  );
  transitionDirectivesToCopyOnIsland.forEach((name) => {
    if (typeof props[name] !== "undefined") {
      island.props[name] = props[name];
    }
  });
  return island;
}

/**
 * shortdash - https://github.com/bibig/node-shorthash
 *
 * @license
 *
 * (The MIT License)
 *
 * Copyright (c) 2013 Bibig <bibig@me.com>
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */
const dictionary = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXY";
const binary = dictionary.length;
function bitwise(str) {
  let hash = 0;
  if (str.length === 0) return hash;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = (hash << 5) - hash + ch;
    hash = hash & hash;
  }
  return hash;
}
function shorthash(text) {
  let num;
  let result = "";
  let integer = bitwise(text);
  const sign = integer < 0 ? "Z" : "";
  integer = Math.abs(integer);
  while (integer >= binary) {
    num = integer % binary;
    integer = Math.floor(integer / binary);
    result = dictionary[num] + result;
  }
  if (integer > 0) {
    result = dictionary[integer] + result;
  }
  return sign + result;
}

const headAndContentSym = /* @__PURE__ */ Symbol.for("astro.headAndContent");
function isHeadAndContent(obj) {
  return typeof obj === "object" && obj !== null && !!obj[headAndContentSym];
}
function createThinHead() {
  return {
    [headAndContentSym]: true
  };
}

var astro_island_prebuilt_default = `(()=>{var g=Object.defineProperty;var w=(c,s,d)=>s in c?g(c,s,{enumerable:!0,configurable:!0,writable:!0,value:d}):c[s]=d;var l=(c,s,d)=>w(c,typeof s!="symbol"?s+"":s,d);var E=new Set(["__proto__","constructor","prototype"]);{let c={0:t=>y(t),1:t=>d(t),2:t=>new RegExp(t),3:t=>new Date(t),4:t=>new Map(d(t)),5:t=>new Set(d(t)),6:t=>BigInt(t),7:t=>new URL(t),8:t=>new Uint8Array(t),9:t=>new Uint16Array(t),10:t=>new Uint32Array(t),11:t=>Number.POSITIVE_INFINITY*t},s=t=>{let[p,e]=t;return p in c?c[p](e):void 0},d=t=>t.map(s),y=t=>typeof t!="object"||t===null?t:Object.fromEntries(Object.entries(t).map(([p,e])=>[p,s(e)]));class f extends HTMLElement{constructor(){super(...arguments);l(this,"Component");l(this,"hydrator");l(this,"hydrate",async()=>{var b;if(!this.hydrator||!this.isConnected)return;let e=(b=this.parentElement)==null?void 0:b.closest("astro-island[ssr]");if(e){e.addEventListener("astro:hydrate",this.hydrate,{once:!0});return}let n=this.querySelectorAll("astro-slot"),r={},i=this.querySelectorAll("template[data-astro-template]");for(let o of i){let a=o.closest(this.tagName);a!=null&&a.isSameNode(this)&&(r[o.getAttribute("data-astro-template")||"default"]=o.innerHTML,o.remove())}for(let o of n){let a=o.closest(this.tagName);a!=null&&a.isSameNode(this)&&(r[o.getAttribute("name")||"default"]=o.innerHTML)}let u;try{u=this.hasAttribute("props")?y(JSON.parse(this.getAttribute("props"))):{}}catch(o){let a=this.getAttribute("component-url")||"<unknown>",v=this.getAttribute("component-export");throw v&&(a+=\` (export \${v})\`),console.error(\`[hydrate] Error parsing props for component \${a}\`,this.getAttribute("props"),o),o}let h;await this.hydrator(this)(this.Component,u,r,{client:this.getAttribute("client")}),this.removeAttribute("ssr"),this.dispatchEvent(new CustomEvent("astro:hydrate"))});l(this,"unmount",()=>{this.isConnected||this.dispatchEvent(new CustomEvent("astro:unmount"))})}disconnectedCallback(){document.removeEventListener("astro:after-swap",this.unmount),document.addEventListener("astro:after-swap",this.unmount,{once:!0})}connectedCallback(){if(!this.hasAttribute("await-children")||document.readyState==="interactive"||document.readyState==="complete")this.childrenConnectedCallback();else{let e=()=>{document.removeEventListener("DOMContentLoaded",e),n.disconnect(),this.childrenConnectedCallback()},n=new MutationObserver(()=>{var r;((r=this.lastChild)==null?void 0:r.nodeType)===Node.COMMENT_NODE&&this.lastChild.nodeValue==="astro:end"&&(this.lastChild.remove(),e())});n.observe(this,{childList:!0}),document.addEventListener("DOMContentLoaded",e)}}async childrenConnectedCallback(){let e=this.getAttribute("before-hydration-url");e&&await import(e),this.start()}getRetryImportUrl(e){let n=new URL(e,document.baseURI),r=\`astro-retry=\${Date.now()}\`,i=n.hash.replace(/^#/,"");return n.hash=i?\`\${i}&\${r}\`:r,n.toString()}async importWithRetry(e){try{return await import(e)}catch(n){return await new Promise(r=>setTimeout(r,1e3)),import(this.getRetryImportUrl(e))}}handleHydrationError(e){let n=this.getAttribute("component-url"),r=new CustomEvent("astro:hydration-error",{cancelable:!0,bubbles:!0,composed:!0,detail:{error:e,componentUrl:n}});this.dispatchEvent(r)&&console.error(\`[astro-island] Error hydrating \${n}\`,e)}async start(){let e=JSON.parse(this.getAttribute("opts")),n=this.getAttribute("client");if(Astro[n]===void 0){window.addEventListener(\`astro:\${n}\`,()=>this.start(),{once:!0});return}try{await Astro[n](async()=>{let r=this.getAttribute("renderer-url");try{let[i,{default:u}]=await Promise.all([this.importWithRetry(this.getAttribute("component-url")),r?this.importWithRetry(r):Promise.resolve({default:()=>()=>{}})]),h=this.getAttribute("component-export")||"default";if(h.includes(".")){this.Component=i;for(let m of h.split(".")){if(E.has(m)||!this.Component||typeof this.Component!="object"&&typeof this.Component!="function"||!Object.hasOwn(this.Component,m))throw new Error(\`Invalid component export path: \${h}\`);this.Component=this.Component[m]}}else{if(E.has(h))throw new Error(\`Invalid component export path: \${h}\`);this.Component=i[h]}return this.hydrator=u,this.hydrate}catch(i){return this.handleHydrationError(i),()=>{}}},e,this)}catch(r){this.handleHydrationError(r)}}attributeChangedCallback(){this.hydrate()}}l(f,"observedAttributes",["props"]),customElements.get("astro-island")||customElements.define("astro-island",f)}})();`;

var astro_island_prebuilt_dev_default = `(()=>{var g=Object.defineProperty;var w=(d,s,h)=>s in d?g(d,s,{enumerable:!0,configurable:!0,writable:!0,value:h}):d[s]=h;var l=(d,s,h)=>w(d,typeof s!="symbol"?s+"":s,h);var E=new Set(["__proto__","constructor","prototype"]);{let d={0:t=>y(t),1:t=>h(t),2:t=>new RegExp(t),3:t=>new Date(t),4:t=>new Map(h(t)),5:t=>new Set(h(t)),6:t=>BigInt(t),7:t=>new URL(t),8:t=>new Uint8Array(t),9:t=>new Uint16Array(t),10:t=>new Uint32Array(t),11:t=>Number.POSITIVE_INFINITY*t},s=t=>{let[p,e]=t;return p in d?d[p](e):void 0},h=t=>t.map(s),y=t=>typeof t!="object"||t===null?t:Object.fromEntries(Object.entries(t).map(([p,e])=>[p,s(e)]));class f extends HTMLElement{constructor(){super(...arguments);l(this,"Component");l(this,"hydrator");l(this,"hydrate",async()=>{var b;if(!this.hydrator||!this.isConnected)return;let e=(b=this.parentElement)==null?void 0:b.closest("astro-island[ssr]");if(e){e.addEventListener("astro:hydrate",this.hydrate,{once:!0});return}let n=this.querySelectorAll("astro-slot"),r={},i=this.querySelectorAll("template[data-astro-template]");for(let o of i){let c=o.closest(this.tagName);c!=null&&c.isSameNode(this)&&(r[o.getAttribute("data-astro-template")||"default"]=o.innerHTML,o.remove())}for(let o of n){let c=o.closest(this.tagName);c!=null&&c.isSameNode(this)&&(r[o.getAttribute("name")||"default"]=o.innerHTML)}let m;try{m=this.hasAttribute("props")?y(JSON.parse(this.getAttribute("props"))):{}}catch(o){let c=this.getAttribute("component-url")||"<unknown>",v=this.getAttribute("component-export");throw v&&(c+=\` (export \${v})\`),console.error(\`[hydrate] Error parsing props for component \${c}\`,this.getAttribute("props"),o),o}let a,u=this.hydrator(this);a=performance.now(),await u(this.Component,m,r,{client:this.getAttribute("client")}),a&&this.setAttribute("client-render-time",(performance.now()-a).toString()),this.removeAttribute("ssr"),this.dispatchEvent(new CustomEvent("astro:hydrate"))});l(this,"unmount",()=>{this.isConnected||this.dispatchEvent(new CustomEvent("astro:unmount"))})}disconnectedCallback(){document.removeEventListener("astro:after-swap",this.unmount),document.addEventListener("astro:after-swap",this.unmount,{once:!0})}connectedCallback(){if(!this.hasAttribute("await-children")||document.readyState==="interactive"||document.readyState==="complete")this.childrenConnectedCallback();else{let e=()=>{document.removeEventListener("DOMContentLoaded",e),n.disconnect(),this.childrenConnectedCallback()},n=new MutationObserver(()=>{var r;((r=this.lastChild)==null?void 0:r.nodeType)===Node.COMMENT_NODE&&this.lastChild.nodeValue==="astro:end"&&(this.lastChild.remove(),e())});n.observe(this,{childList:!0}),document.addEventListener("DOMContentLoaded",e)}}async childrenConnectedCallback(){let e=this.getAttribute("before-hydration-url");e&&await import(e),this.start()}getRetryImportUrl(e){let n=new URL(e,document.baseURI),r=\`astro-retry=\${Date.now()}\`,i=n.hash.replace(/^#/,"");return n.hash=i?\`\${i}&\${r}\`:r,n.toString()}async importWithRetry(e){try{return await import(e)}catch(n){return await new Promise(r=>setTimeout(r,1e3)),import(this.getRetryImportUrl(e))}}handleHydrationError(e){let n=this.getAttribute("component-url"),r=new CustomEvent("astro:hydration-error",{cancelable:!0,bubbles:!0,composed:!0,detail:{error:e,componentUrl:n}});this.dispatchEvent(r)&&console.error(\`[astro-island] Error hydrating \${n}\`,e)}async start(){let e=JSON.parse(this.getAttribute("opts")),n=this.getAttribute("client");if(Astro[n]===void 0){window.addEventListener(\`astro:\${n}\`,()=>this.start(),{once:!0});return}try{await Astro[n](async()=>{let r=this.getAttribute("renderer-url");try{let[i,{default:m}]=await Promise.all([this.importWithRetry(this.getAttribute("component-url")),r?this.importWithRetry(r):Promise.resolve({default:()=>()=>{}})]),a=this.getAttribute("component-export")||"default";if(a.includes(".")){this.Component=i;for(let u of a.split(".")){if(E.has(u)||!this.Component||typeof this.Component!="object"&&typeof this.Component!="function"||!Object.hasOwn(this.Component,u))throw new Error(\`Invalid component export path: \${a}\`);this.Component=this.Component[u]}}else{if(E.has(a))throw new Error(\`Invalid component export path: \${a}\`);this.Component=i[a]}return this.hydrator=m,this.hydrate}catch(i){return this.handleHydrationError(i),()=>{}}},e,this)}catch(r){this.handleHydrationError(r)}}attributeChangedCallback(){this.hydrate()}}l(f,"observedAttributes",["props"]),customElements.get("astro-island")||customElements.define("astro-island",f)}})();`;

const ISLAND_STYLES = "astro-island,astro-slot,astro-static-slot{display:contents}";

function determineIfNeedsHydrationScript(result) {
  if (result._metadata.templateDepth > 0) {
    return !result._metadata.hasHydrationScript;
  }
  if (result._metadata.hasHydrationScript) {
    return false;
  }
  return result._metadata.hasHydrationScript = true;
}
function determinesIfNeedsDirectiveScript(result, directive) {
  if (result._metadata.templateDepth > 0) {
    return !result._metadata.hasDirectives.has(directive);
  }
  if (result._metadata.hasDirectives.has(directive)) {
    return false;
  }
  result._metadata.hasDirectives.add(directive);
  return true;
}
function getDirectiveScriptText(result, directive) {
  const clientDirectives = result.clientDirectives;
  const clientDirective = clientDirectives.get(directive);
  if (!clientDirective) {
    throw new Error(`Unknown directive: ${directive}`);
  }
  return clientDirective;
}
function getPrescripts(result, type, directive) {
  switch (type) {
    case "both":
      return `<style>${ISLAND_STYLES}</style><script>${getDirectiveScriptText(result, directive)}</script><script>${process.env.NODE_ENV === "development" ? astro_island_prebuilt_dev_default : astro_island_prebuilt_default}</script>`;
    case "directive":
      return `<script>${getDirectiveScriptText(result, directive)}</script>`;
  }
}

async function collectPropagatedHeadParts(input) {
  const collectedHeadParts = [];
  const iterator = input.propagators.values();
  while (true) {
    const { value, done } = iterator.next();
    if (done) {
      break;
    }
    const returnValue = await value.init(input.result);
    if (input.isHeadAndContent(returnValue) && returnValue.head) {
      collectedHeadParts.push(returnValue.head);
    }
  }
  return collectedHeadParts;
}

function shouldRenderHeadInstruction(state) {
  return !state.hasRenderedHead && !state.partial;
}
function shouldRenderMaybeHeadInstruction(state) {
  return !state.hasRenderedHead && !state.headInTree && !state.partial;
}
function shouldRenderInstruction$1(type, state) {
  return type === "head" ? shouldRenderHeadInstruction(state) : shouldRenderMaybeHeadInstruction(state);
}

function registerIfPropagating(result, factory, instance) {
  if (factory.propagation === "self" || factory.propagation === "in-tree") {
    result._metadata.propagators.add(
      instance
    );
    return;
  }
  if (factory.moduleId) {
    const hint = result.componentMetadata.get(factory.moduleId)?.propagation;
    if (isPropagatingHint(hint ?? "none")) {
      result._metadata.propagators.add(
        instance
      );
    }
  }
}
async function bufferPropagatedHead(result) {
  const collected = await collectPropagatedHeadParts({
    propagators: result._metadata.propagators,
    result,
    isHeadAndContent
  });
  result._metadata.extraHead.push(...collected);
}
function shouldRenderInstruction(type, state) {
  return shouldRenderInstruction$1(type, state);
}
function getInstructionRenderState(result) {
  return {
    hasRenderedHead: result._metadata.hasRenderedHead,
    headInTree: result._metadata.headInTree,
    partial: result.partial
  };
}

function renderCspContent(result) {
  const finalScriptHashes = /* @__PURE__ */ new Set();
  const finalStyleHashes = /* @__PURE__ */ new Set();
  for (const scriptHash of result.scriptHashes) {
    finalScriptHashes.add(`'${scriptHash}'`);
  }
  for (const styleHash of result.styleHashes) {
    finalStyleHashes.add(`'${styleHash}'`);
  }
  for (const styleHash of result._metadata.extraStyleHashes) {
    finalStyleHashes.add(`'${styleHash}'`);
  }
  for (const scriptHash of result._metadata.extraScriptHashes) {
    finalScriptHashes.add(`'${scriptHash}'`);
  }
  let directives;
  if (result.directives.length > 0) {
    directives = result.directives.join(";") + ";";
  }
  let scriptResources = "'self'";
  if (result.scriptResources.length > 0) {
    scriptResources = result.scriptResources.map((r) => `${r}`).join(" ");
  }
  let styleResources = "'self'";
  if (result.styleResources.length > 0) {
    styleResources = result.styleResources.map((r) => `${r}`).join(" ");
  }
  const strictDynamic = result.isStrictDynamic ? ` 'strict-dynamic'` : "";
  const scriptSrc = `script-src ${scriptResources} ${Array.from(finalScriptHashes).join(" ")}${strictDynamic};`;
  const styleSrc = `style-src ${styleResources} ${Array.from(finalStyleHashes).join(" ")};`;
  return [directives, scriptSrc, styleSrc].filter(Boolean).join(" ");
}

const RenderInstructionSymbol = /* @__PURE__ */ Symbol.for("astro:render");
function createRenderInstruction(instruction) {
  return Object.defineProperty(instruction, RenderInstructionSymbol, {
    value: true
  });
}
function isRenderInstruction(chunk) {
  return chunk && typeof chunk === "object" && chunk[RenderInstructionSymbol];
}

const voidElementNames = /^(area|base|br|col|command|embed|hr|img|input|keygen|link|meta|param|source|track|wbr)$/i;
const htmlBooleanAttributes = /^(?:allowfullscreen|async|autofocus|autoplay|checked|controls|default|defer|disabled|disablepictureinpicture|disableremoteplayback|formnovalidate|inert|loop|muted|nomodule|novalidate|open|playsinline|readonly|required|reversed|scoped|seamless|selected|itemscope)$/i;
const AMPERSAND_REGEX = /&/g;
const DOUBLE_QUOTE_REGEX = /"/g;
const STATIC_DIRECTIVES = /* @__PURE__ */ new Set(["set:html", "set:text"]);
const toIdent = (k) => k.trim().replace(/(?!^)\b\w|\s+|\W+/g, (match, index) => {
  if (/\W/.test(match)) return "";
  return index === 0 ? match : match.toUpperCase();
});
const toAttributeString = (value, shouldEscape = true) => shouldEscape ? String(value).replace(AMPERSAND_REGEX, "&#38;").replace(DOUBLE_QUOTE_REGEX, "&#34;") : value;
const kebab = (k) => k.toLowerCase() === k ? k : k.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
const toStyleString = (obj) => Object.entries(obj).filter(([_, v]) => typeof v === "string" && v.trim() || typeof v === "number").map(([k, v]) => {
  if (k[0] !== "-" && k[1] !== "-") return `${kebab(k)}:${v}`;
  return `${k}:${v}`;
}).join(";");
function defineScriptVars(vars) {
  let output = "";
  for (const [key, value] of Object.entries(vars)) {
    output += `const ${toIdent(key)} = ${stringifyForScript(value)};
`;
  }
  return markHTMLString(output);
}
function formatList(values) {
  if (values.length === 1) {
    return values[0];
  }
  return `${values.slice(0, -1).join(", ")} or ${values[values.length - 1]}`;
}
function isCustomElement(tagName) {
  return tagName.includes("-");
}
function handleBooleanAttribute(key, value, shouldEscape, tagName) {
  if (tagName && isCustomElement(tagName)) {
    return markHTMLString(` ${key}="${toAttributeString(value, shouldEscape)}"`);
  }
  return markHTMLString(value ? ` ${key}` : "");
}
function addAttribute(value, key, shouldEscape = true, tagName = "") {
  if (value == null) {
    return "";
  }
  if (STATIC_DIRECTIVES.has(key)) {
    console.warn(`[astro] The "${key}" directive cannot be applied dynamically at runtime. It will not be rendered as an attribute.

Make sure to use the static attribute syntax (\`${key}={value}\`) instead of the dynamic spread syntax (\`{...{ "${key}": value }}\`).`);
    return "";
  }
  if (key === "class:list") {
    const listValue = toAttributeString(clsx(value), shouldEscape);
    if (listValue === "") {
      return "";
    }
    return markHTMLString(` ${key.slice(0, -5)}="${listValue}"`);
  }
  if (key === "style" && !(value instanceof HTMLString)) {
    if (Array.isArray(value) && value.length === 2) {
      return markHTMLString(
        ` ${key}="${toAttributeString(`${toStyleString(value[0])};${value[1]}`, shouldEscape)}"`
      );
    }
    if (typeof value === "object") {
      return markHTMLString(` ${key}="${toAttributeString(toStyleString(value), shouldEscape)}"`);
    }
  }
  if (key === "className") {
    return markHTMLString(` class="${toAttributeString(value, shouldEscape)}"`);
  }
  if (htmlBooleanAttributes.test(key)) {
    return handleBooleanAttribute(key, value, shouldEscape, tagName);
  }
  if (value === "") {
    return markHTMLString(` ${key}`);
  }
  if (key === "popover" && typeof value === "boolean") {
    return handleBooleanAttribute(key, value, shouldEscape, tagName);
  }
  if (key === "download" && typeof value === "boolean") {
    return handleBooleanAttribute(key, value, shouldEscape, tagName);
  }
  if (key === "hidden" && typeof value === "boolean") {
    return handleBooleanAttribute(key, value, shouldEscape, tagName);
  }
  return markHTMLString(` ${key}="${toAttributeString(value, shouldEscape)}"`);
}
function internalSpreadAttributes(values, shouldEscape = true, tagName) {
  let output = "";
  for (const [key, value] of Object.entries(values)) {
    output += addAttribute(value, key, shouldEscape, tagName);
  }
  return markHTMLString(output);
}
function renderElement$1(name, { props: _props, children = "" }, shouldEscape = true) {
  const { lang: _, "data-astro-id": astroId, "define:vars": defineVars, ...props } = _props;
  if (defineVars) {
    if (name === "style") {
      delete props["is:global"];
      delete props["is:scoped"];
    }
    if (name === "script") {
      delete props.hoist;
      children = defineScriptVars(defineVars) + "\n" + children;
    }
  }
  if ((children == null || children === "") && voidElementNames.test(name)) {
    return `<${name}${internalSpreadAttributes(props, shouldEscape, name)}>`;
  }
  return `<${name}${internalSpreadAttributes(props, shouldEscape, name)}>${children}</${name}>`;
}
const noop = () => {
};
class BufferedRenderer {
  chunks = [];
  renderPromise;
  destination;
  /**
   * Determines whether buffer has been flushed
   * to the final destination.
   */
  flushed = false;
  constructor(destination, renderFunction) {
    this.destination = destination;
    this.renderPromise = renderFunction(this);
    if (isPromise(this.renderPromise)) {
      Promise.resolve(this.renderPromise).catch(noop);
    }
  }
  write(chunk) {
    if (this.flushed) {
      this.destination.write(chunk);
    } else {
      this.chunks.push(chunk);
    }
  }
  flush() {
    if (this.flushed) {
      throw new Error("The render buffer has already been flushed.");
    }
    this.flushed = true;
    for (const chunk of this.chunks) {
      this.destination.write(chunk);
    }
    return this.renderPromise;
  }
}
function createBufferedRenderer(destination, renderFunction) {
  return new BufferedRenderer(destination, renderFunction);
}
const isNode = typeof process !== "undefined" && Object.prototype.toString.call(process) === "[object process]";
const isDeno = typeof Deno !== "undefined";
function promiseWithResolvers() {
  let resolve, reject;
  const promise = new Promise((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });
  return {
    promise,
    resolve,
    reject
  };
}

function stablePropsKey(props) {
  const keys = Object.keys(props).sort();
  let result = "{";
  for (let i = 0; i < keys.length; i++) {
    if (i > 0) result += ",";
    result += JSON.stringify(keys[i]) + ":" + JSON.stringify(props[keys[i]]);
  }
  result += "}";
  return result;
}
function deduplicateElements(elements) {
  if (elements.length <= 1) return elements;
  const seen = /* @__PURE__ */ new Set();
  return elements.filter((item) => {
    const key = stablePropsKey(item.props) + item.children;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function renderAllHeadContent(result) {
  result._metadata.hasRenderedHead = true;
  let content = "";
  if (result.shouldInjectCspMetaTags && result.cspDestination === "meta") {
    content += renderElement$1(
      "meta",
      {
        props: {
          "http-equiv": "content-security-policy",
          content: renderCspContent(result)
        },
        children: ""
      },
      false
    );
  }
  const styles = deduplicateElements(Array.from(result.styles)).map(
    (style) => style.props.rel === "stylesheet" ? renderElement$1("link", style) : renderElement$1("style", style)
  );
  result.styles.clear();
  const scripts = deduplicateElements(Array.from(result.scripts)).map((script) => {
    if (result.userAssetsBase) {
      script.props.src = (result.base === "/" ? "" : result.base) + result.userAssetsBase + script.props.src;
    }
    return renderElement$1("script", script, false);
  });
  const links = deduplicateElements(Array.from(result.links)).map(
    (link) => renderElement$1("link", link, false)
  );
  content += styles.join("\n") + links.join("\n") + scripts.join("\n");
  if (result._metadata.extraHead.length > 0) {
    for (const part of result._metadata.extraHead) {
      content += part;
    }
  }
  return markHTMLString(content);
}
function maybeRenderHead() {
  return createRenderInstruction({ type: "maybe-head" });
}

const ALGORITHMS = {
  "SHA-256": "sha256-",
  "SHA-384": "sha384-",
  "SHA-512": "sha512-"
};
const ALGORITHM_VALUES = Object.values(ALGORITHMS);
z.enum(Object.keys(ALGORITHMS)).optional().default("SHA-256");
z.custom((value) => {
  if (typeof value !== "string") {
    return false;
  }
  return ALGORITHM_VALUES.some((allowedValue) => {
    return value.startsWith(allowedValue);
  });
});
const ALLOWED_DIRECTIVES = [
  "base-uri",
  "child-src",
  "connect-src",
  "default-src",
  "fenced-frame-src",
  "font-src",
  "form-action",
  "frame-ancestors",
  "frame-src",
  "img-src",
  "manifest-src",
  "media-src",
  "object-src",
  "referrer",
  "report-to",
  "report-uri",
  "require-trusted-types-for",
  "sandbox",
  "trusted-types",
  "upgrade-insecure-requests",
  "worker-src"
];
z.custom((value) => {
  if (typeof value !== "string") {
    return false;
  }
  return ALLOWED_DIRECTIVES.some((allowedValue) => {
    return value.startsWith(allowedValue);
  });
});

const ALGORITHM = "AES-GCM";
async function decodeKey(encoded) {
  const bytes = decodeBase64(encoded);
  return crypto.subtle.importKey("raw", bytes.buffer, ALGORITHM, true, [
    "encrypt",
    "decrypt"
  ]);
}
const encoder$1 = new TextEncoder();
const decoder$1 = new TextDecoder();
const IV_LENGTH = 24;
async function encryptString(key, raw, additionalData) {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH / 2));
  const data = encoder$1.encode(raw);
  const params = { name: ALGORITHM, iv };
  if (additionalData) {
    params.additionalData = encoder$1.encode(additionalData);
  }
  const buffer = await crypto.subtle.encrypt(params, key, data);
  return encodeHexUpperCase(iv) + encodeBase64(new Uint8Array(buffer));
}
async function decryptString(key, encoded, additionalData) {
  const iv = decodeHex(encoded.slice(0, IV_LENGTH));
  const dataArray = decodeBase64(encoded.slice(IV_LENGTH));
  const params = { name: ALGORITHM, iv };
  if (additionalData) {
    params.additionalData = encoder$1.encode(additionalData);
  }
  const decryptedBuffer = await crypto.subtle.decrypt(params, key, dataArray);
  const decryptedString = decoder$1.decode(decryptedBuffer);
  return decryptedString;
}
async function generateCspDigest(data, algorithm) {
  const hashBuffer = await crypto.subtle.digest(algorithm, encoder$1.encode(data));
  const hash = encodeBase64(new Uint8Array(hashBuffer));
  return `${ALGORITHMS[algorithm]}${hash}`;
}

const renderTemplateResultSym = /* @__PURE__ */ Symbol.for("astro.renderTemplateResult");
class RenderTemplateResult {
  [renderTemplateResultSym] = true;
  htmlParts;
  expressions;
  error;
  constructor(htmlParts, expressions) {
    this.htmlParts = htmlParts;
    this.error = void 0;
    this.expressions = expressions.map((expression) => {
      if (isPromise(expression)) {
        return Promise.resolve(expression).catch((err) => {
          if (!this.error) {
            this.error = err;
            throw err;
          }
        });
      }
      return expression;
    });
  }
  render(destination) {
    const { htmlParts, expressions } = this;
    for (let i = 0; i < htmlParts.length; i++) {
      const html = htmlParts[i];
      if (html) {
        destination.write(markHTMLString(html));
      }
      if (i >= expressions.length) break;
      const exp = expressions[i];
      if (!(exp || exp === 0)) continue;
      const result = renderChild(destination, exp);
      if (isPromise(result)) {
        const startIdx = i + 1;
        const remaining = expressions.length - startIdx;
        const flushers = new Array(remaining);
        for (let j = 0; j < remaining; j++) {
          const rExp = expressions[startIdx + j];
          flushers[j] = createBufferedRenderer(destination, (bufferDestination) => {
            if (rExp || rExp === 0) {
              return renderChild(bufferDestination, rExp);
            }
          });
        }
        return result.then(() => {
          let k = 0;
          const iterate = () => {
            while (k < flushers.length) {
              const rHtml = htmlParts[startIdx + k];
              if (rHtml) {
                destination.write(markHTMLString(rHtml));
              }
              const flushResult = flushers[k++].flush();
              if (isPromise(flushResult)) {
                return flushResult.then(iterate);
              }
            }
            const lastHtml = htmlParts[htmlParts.length - 1];
            if (lastHtml) {
              destination.write(markHTMLString(lastHtml));
            }
          };
          return iterate();
        });
      }
    }
  }
}
function isRenderTemplateResult(obj) {
  return typeof obj === "object" && obj !== null && !!obj[renderTemplateResultSym];
}
function renderTemplate(htmlParts, ...expressions) {
  return new RenderTemplateResult(htmlParts, expressions);
}

const slotString = /* @__PURE__ */ Symbol.for("astro:slot-string");
class SlotString extends HTMLString {
  instructions;
  [slotString];
  constructor(content, instructions) {
    super(content);
    this.instructions = instructions;
    this[slotString] = true;
  }
}
function isSlotString(str) {
  return !!str[slotString];
}
function mergeSlotInstructions(target, source) {
  if (source.instructions?.length) {
    target ??= [];
    target.push(...source.instructions);
  }
  return target;
}
function renderSlot(result, slotted, fallback) {
  if (!slotted && fallback) {
    return renderSlot(result, fallback);
  }
  return {
    async render(destination) {
      await renderChild(destination, typeof slotted === "function" ? slotted(result) : slotted);
    }
  };
}
async function renderSlotToString(result, slotted, fallback) {
  let content = "";
  let instructions = null;
  const temporaryDestination = {
    write(chunk) {
      if (chunk instanceof SlotString) {
        content += chunk;
        instructions = mergeSlotInstructions(instructions, chunk);
      } else if (chunk instanceof Response) return;
      else if (typeof chunk === "object" && "type" in chunk && typeof chunk.type === "string") {
        if (instructions === null) {
          instructions = [];
        }
        instructions.push(chunk);
      } else {
        content += chunkToString(result, chunk);
      }
    }
  };
  const renderInstance = renderSlot(result, slotted, fallback);
  await renderInstance.render(temporaryDestination);
  return markHTMLString(new SlotString(content, instructions));
}
async function renderSlots(result, slots = {}) {
  let slotInstructions = null;
  let children = {};
  if (slots) {
    await Promise.all(
      Object.entries(slots).map(
        ([key, value]) => renderSlotToString(result, value).then((output) => {
          if (output.instructions) {
            if (slotInstructions === null) {
              slotInstructions = [];
            }
            slotInstructions.push(...output.instructions);
          }
          children[key] = output;
        })
      )
    );
  }
  return { slotInstructions, children };
}
function createSlotValueFromString(content) {
  return function() {
    return renderTemplate`${unescapeHTML(content)}`;
  };
}

const internalProps = /* @__PURE__ */ new Set([
  "server:component-path",
  "server:component-export",
  "server:component-directive",
  "server:defer"
]);
function containsServerDirective(props) {
  return "server:component-directive" in props;
}
function createSearchParams(encryptedComponentExport, encryptedProps, slots) {
  const params = new URLSearchParams();
  params.set("e", encryptedComponentExport);
  params.set("p", encryptedProps);
  params.set("s", slots);
  return params;
}
function isWithinURLLimit(pathname, params) {
  const url = pathname + "?" + params.toString();
  const chars = url.length;
  return chars < 2048;
}
class ServerIslandComponent {
  result;
  props;
  slots;
  displayName;
  hostId;
  islandContent;
  componentPath;
  componentExport;
  componentId;
  constructor(result, props, slots, displayName) {
    this.result = result;
    this.props = props;
    this.slots = slots;
    this.displayName = displayName;
  }
  async init() {
    const content = await this.getIslandContent();
    if (this.result.cspDestination) {
      this.result._metadata.extraScriptHashes.push(
        await generateCspDigest(SERVER_ISLAND_REPLACER, this.result.cspAlgorithm)
      );
      const contentDigest = await generateCspDigest(content, this.result.cspAlgorithm);
      this.result._metadata.extraScriptHashes.push(contentDigest);
    }
    return createThinHead();
  }
  async render(destination) {
    const hostId = await this.getHostId();
    const islandContent = await this.getIslandContent();
    destination.write(createRenderInstruction({ type: "server-island-runtime" }));
    destination.write("<!--[if astro]>server-island-start<![endif]-->");
    for (const name in this.slots) {
      if (name === "fallback") {
        await renderChild(destination, this.slots.fallback(this.result));
      }
    }
    destination.write(
      `<script type="module" data-astro-rerun data-island-id="${hostId}">${islandContent}</script>`
    );
  }
  getComponentPath() {
    if (this.componentPath) {
      return this.componentPath;
    }
    const componentPath = this.props["server:component-path"];
    if (!componentPath) {
      throw new Error(`Could not find server component path`);
    }
    this.componentPath = componentPath;
    return componentPath;
  }
  getComponentExport() {
    if (this.componentExport) {
      return this.componentExport;
    }
    const componentExport = this.props["server:component-export"];
    if (!componentExport) {
      throw new Error(`Could not find server component export`);
    }
    this.componentExport = componentExport;
    return componentExport;
  }
  async getHostId() {
    if (!this.hostId) {
      this.hostId = await crypto.randomUUID();
    }
    return this.hostId;
  }
  async getIslandContent() {
    if (this.islandContent) {
      return this.islandContent;
    }
    const componentPath = this.getComponentPath();
    const componentExport = this.getComponentExport();
    const serverIslandNameMap = await this.result.getServerIslandNameMap();
    let componentId = serverIslandNameMap.get(componentPath);
    if (!componentId) {
      throw new Error(`Could not find server component name ${componentPath}`);
    }
    for (const key2 of Object.keys(this.props)) {
      if (internalProps.has(key2)) {
        delete this.props[key2];
      }
    }
    const renderedSlots = {};
    for (const name in this.slots) {
      if (name !== "fallback") {
        const content = await renderSlotToString(this.result, this.slots[name]);
        let slotHtml = content.toString();
        const slotContent = content;
        if (Array.isArray(slotContent.instructions)) {
          for (const instruction of slotContent.instructions) {
            if (instruction.type === "script") {
              slotHtml += instruction.content;
            }
          }
        }
        renderedSlots[name] = slotHtml;
      }
    }
    const key = await this.result.key;
    const componentExportEncrypted = await encryptString(
      key,
      componentExport,
      `export:${componentId}`
    );
    const propsEncrypted = Object.keys(this.props).length === 0 ? "" : await encryptString(key, JSON.stringify(this.props), `props:${componentId}`);
    const slotsEncrypted = Object.keys(renderedSlots).length === 0 ? "" : await encryptString(key, JSON.stringify(renderedSlots), `slots:${componentId}`);
    const hostId = await this.getHostId();
    const slash = this.result.base.endsWith("/") ? "" : "/";
    let serverIslandUrl = `${this.result.base}${slash}_server-islands/${componentId}${this.result.trailingSlash === "always" ? "/" : ""}`;
    const potentialSearchParams = createSearchParams(
      componentExportEncrypted,
      propsEncrypted,
      slotsEncrypted
    );
    const useGETRequest = isWithinURLLimit(serverIslandUrl, potentialSearchParams);
    if (useGETRequest) {
      serverIslandUrl += "?" + potentialSearchParams.toString();
      this.result._metadata.extraHead.push(
        markHTMLString(
          `<link rel="preload" as="fetch" href="${serverIslandUrl}" crossorigin="anonymous">`
        )
      );
    }
    const adapterHeaders = this.result.internalFetchHeaders || {};
    const headersJson = stringifyForScript(adapterHeaders);
    const method = useGETRequest ? (
      // GET request
      `const headers = new Headers(${headersJson});
let response = await fetch('${serverIslandUrl}', { headers });`
    ) : (
      // POST request
      `let data = {
	encryptedComponentExport: ${stringifyForScript(componentExportEncrypted)},
	encryptedProps: ${stringifyForScript(propsEncrypted)},
	encryptedSlots: ${stringifyForScript(slotsEncrypted)},
};
const headers = new Headers({ 'Content-Type': 'application/json', ...${headersJson} });
let response = await fetch('${serverIslandUrl}', {
	method: 'POST',
	body: JSON.stringify(data),
	headers,
});`
    );
    this.islandContent = `${method}replaceServerIsland('${hostId}', response);`;
    return this.islandContent;
  }
}
const renderServerIslandRuntime = () => {
  return `<script>${SERVER_ISLAND_REPLACER}</script>`;
};
const SERVER_ISLAND_REPLACER = markHTMLString(
  `async function replaceServerIsland(id, r) {
	let s = document.querySelector(\`script[data-island-id="\${id}"]\`);
	// If there's no matching script, or the request fails then return
	if (!s || r.status !== 200 || r.headers.get('content-type')?.split(';')[0].trim() !== 'text/html') return;
	// Load the HTML before modifying the DOM in case of errors
	let html = await r.text();
	// Remove any placeholder content before the island script
	while (s.previousSibling && s.previousSibling.nodeType !== 8 && s.previousSibling.data !== '[if astro]>server-island-start<![endif]')
		s.previousSibling.remove();
	s.previousSibling?.remove();
	// Insert the new HTML
	s.before(document.createRange().createContextualFragment(html));
	// Remove the script. Prior to v5.4.2, this was the trick to force rerun of scripts.  Keeping it to minimize change to the existing behavior.
	s.remove();
}`.split("\n").map((line) => line.trim()).filter((line) => line && !line.startsWith("//")).join(" ")
);

const Fragment = /* @__PURE__ */ Symbol.for("astro:fragment");
const Renderer = /* @__PURE__ */ Symbol.for("astro:renderer");
const encoder = new TextEncoder();
const decoder = new TextDecoder();
function stringifyChunk(result, chunk) {
  if (isRenderInstruction(chunk)) {
    const instruction = chunk;
    switch (instruction.type) {
      case "directive": {
        const { hydration } = instruction;
        const needsHydrationScript = hydration && determineIfNeedsHydrationScript(result);
        const needsDirectiveScript = hydration && determinesIfNeedsDirectiveScript(result, hydration.directive);
        if (needsHydrationScript) {
          const prescripts = getPrescripts(result, "both", hydration.directive);
          return markHTMLString(prescripts);
        } else if (needsDirectiveScript) {
          const prescripts = getPrescripts(result, "directive", hydration.directive);
          return markHTMLString(prescripts);
        } else {
          return "";
        }
      }
      case "head": {
        if (!shouldRenderInstruction("head", getInstructionRenderState(result))) {
          return "";
        }
        return renderAllHeadContent(result);
      }
      case "maybe-head": {
        if (!shouldRenderInstruction("maybe-head", getInstructionRenderState(result))) {
          return "";
        }
        return renderAllHeadContent(result);
      }
      case "renderer-hydration-script": {
        const { rendererSpecificHydrationScripts } = result._metadata;
        const { rendererName } = instruction;
        if (result._metadata.templateDepth > 0) {
          return instruction.render();
        }
        if (!rendererSpecificHydrationScripts.has(rendererName)) {
          rendererSpecificHydrationScripts.add(rendererName);
          return instruction.render();
        }
        return "";
      }
      case "server-island-runtime": {
        if (result._metadata.templateDepth > 0) {
          return renderServerIslandRuntime();
        }
        if (result._metadata.hasRenderedServerIslandRuntime) {
          return "";
        }
        result._metadata.hasRenderedServerIslandRuntime = true;
        return renderServerIslandRuntime();
      }
      case "script": {
        const { id, content } = instruction;
        if (result._metadata.templateDepth > 0) {
          return content;
        }
        if (result._metadata.renderedScripts.has(id)) {
          return "";
        }
        result._metadata.renderedScripts.add(id);
        return content;
      }
      case "template-enter": {
        result._metadata.templateDepth++;
        return "";
      }
      case "template-exit": {
        if (result._metadata.templateDepth <= 0) {
          throw new Error(
            "Unexpected template-exit instruction without a matching template-enter. This may indicate that the compiler emitted unbalanced template boundaries, or that a component manually injected a template-exit render instruction."
          );
        }
        result._metadata.templateDepth--;
        return "";
      }
      default: {
        throw new Error(`Unknown chunk type: ${chunk.type}`);
      }
    }
  } else if (chunk instanceof Response) {
    return "";
  } else if (isSlotString(chunk)) {
    let out = "";
    const c = chunk;
    if (c.instructions) {
      for (const instr of c.instructions) {
        out += stringifyChunk(result, instr);
      }
    }
    out += chunk.toString();
    return out;
  }
  return chunk.toString();
}
function chunkToString(result, chunk) {
  if (ArrayBuffer.isView(chunk)) {
    return decoder.decode(chunk);
  } else {
    return stringifyChunk(result, chunk);
  }
}
function chunkToByteArray(result, chunk) {
  if (ArrayBuffer.isView(chunk)) {
    return chunk;
  } else {
    const stringified = stringifyChunk(result, chunk);
    return encoder.encode(stringified.toString());
  }
}
function chunkToByteArrayOrString(result, chunk) {
  if (ArrayBuffer.isView(chunk)) {
    return chunk;
  } else {
    return stringifyChunk(result, chunk).toString();
  }
}
function isRenderInstance(obj) {
  return !!obj && typeof obj === "object" && "render" in obj && typeof obj.render === "function";
}

function renderChild(destination, child) {
  if (typeof child === "string") {
    destination.write(markHTMLString(escapeHTML(child)));
    return;
  }
  if (isPromise(child)) {
    return child.then((x) => renderChild(destination, x));
  }
  if (child instanceof SlotString) {
    destination.write(child);
    return;
  }
  if (isHTMLString(child)) {
    destination.write(child);
    return;
  }
  if (!child && child !== 0) {
    return;
  }
  if (Array.isArray(child)) {
    return renderArray(destination, child);
  }
  if (typeof child === "function") {
    return renderChild(destination, child());
  }
  if (isRenderInstance(child)) {
    return child.render(destination);
  }
  if (isRenderTemplateResult(child)) {
    return child.render(destination);
  }
  if (isAstroComponentInstance(child)) {
    return child.render(destination);
  }
  if (ArrayBuffer.isView(child)) {
    destination.write(child);
    return;
  }
  if (typeof child === "object" && (Symbol.asyncIterator in child || Symbol.iterator in child)) {
    if (Symbol.asyncIterator in child) {
      return renderAsyncIterable(destination, child);
    }
    return renderIterable(destination, child);
  }
  destination.write(child);
}
function renderArray(destination, children) {
  for (let i = 0; i < children.length; i++) {
    const result = renderChild(destination, children[i]);
    if (isPromise(result)) {
      if (i + 1 >= children.length) {
        return result;
      }
      const remaining = children.length - i - 1;
      const flushers = new Array(remaining);
      for (let j = 0; j < remaining; j++) {
        flushers[j] = createBufferedRenderer(destination, (bufferDestination) => {
          return renderChild(bufferDestination, children[i + 1 + j]);
        });
      }
      return result.then(() => {
        let k = 0;
        const iterate = () => {
          while (k < flushers.length) {
            const flushResult = flushers[k++].flush();
            if (isPromise(flushResult)) {
              return flushResult.then(iterate);
            }
          }
        };
        return iterate();
      });
    }
  }
}
function renderIterable(destination, children) {
  const iterator = children[Symbol.iterator]();
  const iterate = () => {
    for (; ; ) {
      const { value, done } = iterator.next();
      if (done) {
        break;
      }
      const result = renderChild(destination, value);
      if (isPromise(result)) {
        return result.then(iterate);
      }
    }
  };
  return iterate();
}
async function renderAsyncIterable(destination, children) {
  for await (const value of children) {
    await renderChild(destination, value);
  }
}

const astroComponentInstanceSym = /* @__PURE__ */ Symbol.for("astro.componentInstance");
class AstroComponentInstance {
  [astroComponentInstanceSym] = true;
  result;
  props;
  slotValues;
  factory;
  returnValue;
  constructor(result, props, slots, factory) {
    this.result = result;
    this.props = props;
    this.factory = factory;
    this.slotValues = {};
    for (const name in slots) {
      let didRender = false;
      let value = slots[name](result);
      this.slotValues[name] = () => {
        if (!didRender) {
          didRender = true;
          return value;
        }
        return slots[name](result);
      };
    }
  }
  init(result) {
    if (this.returnValue !== void 0) {
      return this.returnValue;
    }
    this.returnValue = this.factory(result, this.props, this.slotValues);
    if (isPromise(this.returnValue)) {
      this.returnValue.then((resolved) => {
        this.returnValue = resolved;
      }).catch(() => {
      });
    }
    return this.returnValue;
  }
  render(destination) {
    const returnValue = this.init(this.result);
    if (isPromise(returnValue)) {
      return returnValue.then((x) => this.renderImpl(destination, x));
    }
    return this.renderImpl(destination, returnValue);
  }
  renderImpl(destination, returnValue) {
    if (isHeadAndContent(returnValue)) {
      return returnValue.content.render(destination);
    } else {
      return renderChild(destination, returnValue);
    }
  }
}
function validateComponentProps(props, clientDirectives, displayName) {
  if (props != null) {
    const directives = [...clientDirectives.keys()].map((directive) => `client:${directive}`);
    for (const prop of Object.keys(props)) {
      if (directives.includes(prop)) {
        console.warn(
          `You are attempting to render <${displayName} ${prop} />, but ${displayName} is an Astro component. Astro components do not render in the client and should not have a hydration directive. Please use a framework component for client rendering.`
        );
      }
    }
  }
}
function createAstroComponentInstance(result, displayName, factory, props, slots = {}) {
  validateComponentProps(props, result.clientDirectives, displayName);
  const instance = new AstroComponentInstance(result, props, slots, factory);
  registerIfPropagating(result, factory, instance);
  return instance;
}
function isAstroComponentInstance(obj) {
  return typeof obj === "object" && obj !== null && !!obj[astroComponentInstanceSym];
}

const DOCTYPE_EXP = /<!doctype html/i;
async function renderToString(result, componentFactory, props, children, isPage = false, route) {
  const templateResult = await callComponentAsTemplateResultOrResponse(
    result,
    componentFactory,
    props,
    children,
    route
  );
  if (templateResult instanceof Response) return templateResult;
  let str = "";
  let renderedFirstPageChunk = false;
  if (isPage) {
    await bufferHeadContent(result);
  }
  const destination = {
    write(chunk) {
      if (isPage && !renderedFirstPageChunk) {
        renderedFirstPageChunk = true;
        if (!result.partial && !DOCTYPE_EXP.test(String(chunk))) {
          const doctype = result.compressHTML ? "<!DOCTYPE html>" : "<!DOCTYPE html>\n";
          str += doctype;
        }
      }
      if (chunk instanceof Response) return;
      str += chunkToString(result, chunk);
    }
  };
  await templateResult.render(destination);
  return str;
}
async function renderToReadableStream(result, componentFactory, props, children, isPage = false, route) {
  const templateResult = await callComponentAsTemplateResultOrResponse(
    result,
    componentFactory,
    props,
    children,
    route
  );
  if (templateResult instanceof Response) return templateResult;
  let renderedFirstPageChunk = false;
  if (isPage) {
    await bufferHeadContent(result);
  }
  return new ReadableStream({
    start(controller) {
      const destination = {
        write(chunk) {
          if (isPage && !renderedFirstPageChunk) {
            renderedFirstPageChunk = true;
            if (!result.partial && !DOCTYPE_EXP.test(String(chunk))) {
              const doctype = result.compressHTML ? "<!DOCTYPE html>" : "<!DOCTYPE html>\n";
              controller.enqueue(encoder.encode(doctype));
            }
          }
          if (chunk instanceof Response) {
            throw new AstroError({
              ...ResponseSentError
            });
          }
          const bytes = chunkToByteArray(result, chunk);
          controller.enqueue(bytes);
        }
      };
      (async () => {
        try {
          await templateResult.render(destination);
          controller.close();
        } catch (e) {
          if (AstroError.is(e) && !e.loc) {
            e.setLocation({
              file: route?.component
            });
          }
          setTimeout(() => controller.error(e), 0);
        }
      })();
    },
    cancel() {
      result.cancelled = true;
    }
  });
}
async function callComponentAsTemplateResultOrResponse(result, componentFactory, props, children, route) {
  const factoryResult = await componentFactory(result, props, children);
  if (factoryResult instanceof Response) {
    return factoryResult;
  } else if (isHeadAndContent(factoryResult)) {
    if (!isRenderTemplateResult(factoryResult.content)) {
      throw new AstroError({
        ...OnlyResponseCanBeReturned,
        message: OnlyResponseCanBeReturned.message(
          route?.route,
          typeof factoryResult
        ),
        location: {
          file: route?.component
        }
      });
    }
    return factoryResult.content;
  } else if (!isRenderTemplateResult(factoryResult)) {
    throw new AstroError({
      ...OnlyResponseCanBeReturned,
      message: OnlyResponseCanBeReturned.message(route?.route, typeof factoryResult),
      location: {
        file: route?.component
      }
    });
  }
  return factoryResult;
}
async function bufferHeadContent(result) {
  await bufferPropagatedHead(result);
}
async function renderToAsyncIterable(result, componentFactory, props, children, isPage = false, route) {
  const templateResult = await callComponentAsTemplateResultOrResponse(
    result,
    componentFactory,
    props,
    children,
    route
  );
  if (templateResult instanceof Response) return templateResult;
  let renderedFirstPageChunk = false;
  if (isPage) {
    await bufferHeadContent(result);
  }
  let error = null;
  let next = null;
  const buffer = [];
  let renderingComplete = false;
  const iterator = {
    async next() {
      if (result.cancelled) return { done: true, value: void 0 };
      if (next !== null) {
        await next.promise;
      } else if (!renderingComplete && !buffer.length) {
        next = promiseWithResolvers();
        await next.promise;
      }
      if (!renderingComplete) {
        next = promiseWithResolvers();
      }
      if (error) {
        throw error;
      }
      let length = 0;
      let stringToEncode = "";
      for (let i = 0, len = buffer.length; i < len; i++) {
        const bufferEntry = buffer[i];
        if (typeof bufferEntry === "string") {
          const nextIsString = i + 1 < len && typeof buffer[i + 1] === "string";
          stringToEncode += bufferEntry;
          if (!nextIsString) {
            const encoded = encoder.encode(stringToEncode);
            length += encoded.length;
            stringToEncode = "";
            buffer[i] = encoded;
          } else {
            buffer[i] = "";
          }
        } else {
          length += bufferEntry.length;
        }
      }
      let mergedArray = new Uint8Array(length);
      let offset = 0;
      for (let i = 0, len = buffer.length; i < len; i++) {
        const item = buffer[i];
        if (item === "") {
          continue;
        }
        mergedArray.set(item, offset);
        offset += item.length;
      }
      buffer.length = 0;
      const returnValue = {
        // The iterator is done when rendering has finished
        // and there are no more chunks to return.
        done: length === 0 && renderingComplete,
        value: mergedArray
      };
      return returnValue;
    },
    async return() {
      result.cancelled = true;
      return { done: true, value: void 0 };
    }
  };
  const destination = {
    write(chunk) {
      if (isPage && !renderedFirstPageChunk) {
        renderedFirstPageChunk = true;
        if (!result.partial && !DOCTYPE_EXP.test(String(chunk))) {
          const doctype = result.compressHTML ? "<!DOCTYPE html>" : "<!DOCTYPE html>\n";
          buffer.push(encoder.encode(doctype));
        }
      }
      if (chunk instanceof Response) {
        throw new AstroError(ResponseSentError);
      }
      const bytes = chunkToByteArrayOrString(result, chunk);
      if (bytes.length > 0) {
        buffer.push(bytes);
        next?.resolve();
      } else if (buffer.length > 0) {
        next?.resolve();
      }
    }
  };
  const renderResult = toPromise(() => templateResult.render(destination));
  renderResult.catch((err) => {
    error = err;
  }).finally(() => {
    renderingComplete = true;
    next?.resolve();
  });
  return {
    [Symbol.asyncIterator]() {
      return iterator;
    }
  };
}
function toPromise(fn) {
  try {
    const result = fn();
    return isPromise(result) ? result : Promise.resolve(result);
  } catch (err) {
    return Promise.reject(err);
  }
}

function componentIsHTMLElement(Component) {
  return typeof HTMLElement !== "undefined" && HTMLElement.isPrototypeOf(Component);
}
async function renderHTMLElement$1(result, constructor, props, slots) {
  const name = getHTMLElementName(constructor);
  let attrHTML = "";
  for (const attr in props) {
    attrHTML += ` ${attr}="${toAttributeString(await props[attr])}"`;
  }
  return markHTMLString(
    `<${name}${attrHTML}>${await renderSlotToString(result, slots?.default)}</${name}>`
  );
}
function getHTMLElementName(constructor) {
  const definedName = customElements.getName(constructor);
  if (definedName) return definedName;
  const assignedName = constructor.name.replace(/^HTML|Element$/g, "").replace(/[A-Z]/g, "-$&").toLowerCase().replace(/^-/, "html-");
  return assignedName;
}

const needsHeadRenderingSymbol = /* @__PURE__ */ Symbol.for("astro.needsHeadRendering");
const rendererAliases = /* @__PURE__ */ new Map([["solid", "solid-js"]]);
const clientOnlyValues = /* @__PURE__ */ new Set(["solid-js", "react", "preact", "vue", "svelte"]);
function guessRenderers(componentUrl) {
  const extname = componentUrl?.split(".").pop();
  switch (extname) {
    case "svelte":
      return ["@astrojs/svelte"];
    case "vue":
      return ["@astrojs/vue"];
    case "jsx":
    case "tsx":
      return ["@astrojs/react", "@astrojs/preact", "@astrojs/solid-js", "@astrojs/vue (jsx)"];
    case void 0:
    default:
      return [
        "@astrojs/react",
        "@astrojs/preact",
        "@astrojs/solid-js",
        "@astrojs/vue",
        "@astrojs/svelte"
      ];
  }
}
function isFragmentComponent(Component) {
  return Component === Fragment;
}
function isHTMLComponent(Component) {
  return Component && Component["astro:html"] === true;
}
const ASTRO_SLOT_EXP = /<\/?astro-slot\b[^>]*>/g;
const ASTRO_STATIC_SLOT_EXP = /<\/?astro-static-slot\b[^>]*>/g;
function removeStaticAstroSlot(html, supportsAstroStaticSlot = true) {
  const exp = supportsAstroStaticSlot ? ASTRO_STATIC_SLOT_EXP : ASTRO_SLOT_EXP;
  return html.replace(exp, "");
}
async function renderFrameworkComponent(result, displayName, Component, _props, slots = {}) {
  if (!Component && "client:only" in _props === false) {
    throw new Error(
      `Unable to render ${displayName} because it is ${Component}!
Did you forget to import the component or is it possible there is a typo?`
    );
  }
  const { renderers, clientDirectives } = result;
  const metadata = {
    astroStaticSlot: true,
    displayName
  };
  const { hydration, isPage, props, propsWithoutTransitionAttributes } = extractDirectives(
    _props,
    clientDirectives
  );
  let html = "";
  let attrs = void 0;
  if (hydration) {
    metadata.hydrate = hydration.directive;
    metadata.hydrateArgs = hydration.value;
    metadata.componentExport = hydration.componentExport;
    metadata.componentUrl = hydration.componentUrl;
  }
  const probableRendererNames = guessRenderers(metadata.componentUrl);
  const validRenderers = renderers.filter((r) => r.name !== "astro:jsx");
  const { children, slotInstructions } = await renderSlots(result, slots);
  let renderer;
  if (metadata.hydrate !== "only") {
    let isTagged = false;
    try {
      isTagged = Component && Component[Renderer];
    } catch {
    }
    if (isTagged) {
      const rendererName = Component[Renderer];
      renderer = renderers.find(({ name }) => name === rendererName);
    }
    if (!renderer) {
      let error;
      for (const r of renderers) {
        try {
          if (await r.ssr.check.call({ result }, Component, props, children, metadata)) {
            renderer = r;
            break;
          }
        } catch (e) {
          error ??= e;
        }
      }
      if (!renderer && error) {
        throw error;
      }
    }
    if (!renderer && typeof HTMLElement === "function" && componentIsHTMLElement(Component)) {
      const output = await renderHTMLElement$1(
        result,
        Component,
        _props,
        slots
      );
      return {
        render(destination) {
          destination.write(output);
        }
      };
    }
  } else {
    if (metadata.hydrateArgs) {
      const rendererName = rendererAliases.has(metadata.hydrateArgs) ? rendererAliases.get(metadata.hydrateArgs) : metadata.hydrateArgs;
      if (clientOnlyValues.has(rendererName)) {
        renderer = renderers.find(
          ({ name }) => name === `@astrojs/${rendererName}` || name === rendererName
        );
      }
    }
    if (!renderer && validRenderers.length === 1) {
      renderer = validRenderers[0];
    }
    if (!renderer) {
      const extname = metadata.componentUrl?.split(".").pop();
      renderer = renderers.find(({ name }) => name === `@astrojs/${extname}` || name === extname);
    }
    if (!renderer && metadata.hydrateArgs) {
      const rendererName = metadata.hydrateArgs;
      if (typeof rendererName === "string") {
        renderer = renderers.find(({ name }) => name === rendererName);
      }
    }
  }
  let componentServerRenderEndTime;
  if (!renderer) {
    if (metadata.hydrate === "only") {
      const rendererName = rendererAliases.has(metadata.hydrateArgs) ? rendererAliases.get(metadata.hydrateArgs) : metadata.hydrateArgs;
      if (clientOnlyValues.has(rendererName)) {
        const plural = validRenderers.length > 1;
        throw new AstroError({
          ...NoMatchingRenderer,
          message: NoMatchingRenderer.message(
            metadata.displayName,
            metadata?.componentUrl?.split(".").pop(),
            plural,
            validRenderers.length
          ),
          hint: NoMatchingRenderer.hint(
            formatList(probableRendererNames.map((r) => "`" + r + "`"))
          )
        });
      } else {
        throw new AstroError({
          ...NoClientOnlyHint,
          message: NoClientOnlyHint.message(metadata.displayName),
          hint: NoClientOnlyHint.hint(
            probableRendererNames.map((r) => r.replace("@astrojs/", "")).join("|")
          )
        });
      }
    } else if (typeof Component !== "string") {
      const matchingRenderers = validRenderers.filter(
        (r) => probableRendererNames.includes(r.name)
      );
      const plural = validRenderers.length > 1;
      if (matchingRenderers.length === 0) {
        throw new AstroError({
          ...NoMatchingRenderer,
          message: NoMatchingRenderer.message(
            metadata.displayName,
            metadata?.componentUrl?.split(".").pop(),
            plural,
            validRenderers.length
          ),
          hint: NoMatchingRenderer.hint(
            formatList(probableRendererNames.map((r) => "`" + r + "`"))
          )
        });
      } else if (matchingRenderers.length === 1) {
        renderer = matchingRenderers[0];
        ({ html, attrs } = await renderer.ssr.renderToStaticMarkup.call(
          { result },
          Component,
          propsWithoutTransitionAttributes,
          children,
          metadata
        ));
      } else {
        throw new Error(`Unable to render ${metadata.displayName}!

This component likely uses ${formatList(probableRendererNames)},
but Astro encountered an error during server-side rendering.

Please ensure that ${metadata.displayName}:
1. Does not unconditionally access browser-specific globals like \`window\` or \`document\`.
   If this is unavoidable, use the \`client:only\` hydration directive.
2. Does not conditionally return \`null\` or \`undefined\` when rendered on the server.
3. If using multiple JSX frameworks at the same time (e.g. React + Preact), pass the correct \`include\`/\`exclude\` options to integrations.

If you're still stuck, please open an issue on GitHub or join us at https://astro.build/chat.`);
      }
    }
  } else {
    if (metadata.hydrate === "only") {
      html = await renderSlotToString(result, slots?.fallback);
    } else {
      const componentRenderStartTime = performance.now();
      ({ html, attrs } = await renderer.ssr.renderToStaticMarkup.call(
        { result },
        Component,
        propsWithoutTransitionAttributes,
        children,
        metadata
      ));
      if (process.env.NODE_ENV === "development")
        componentServerRenderEndTime = performance.now() - componentRenderStartTime;
    }
  }
  if (!html && typeof Component === "string") {
    const Tag = sanitizeElementName(Component);
    const childSlots = Object.values(children).join("");
    const renderTemplateResult = renderTemplate`<${Tag}${internalSpreadAttributes(
      props,
      true,
      Tag
    )}${markHTMLString(
      childSlots === "" && voidElementNames.test(Tag) ? `/>` : `>${childSlots}</${Tag}>`
    )}`;
    html = "";
    const destination = {
      write(chunk) {
        if (chunk instanceof Response) return;
        html += chunkToString(result, chunk);
      }
    };
    await renderTemplateResult.render(destination);
  }
  if (!hydration) {
    return {
      render(destination) {
        if (slotInstructions) {
          for (const instruction of slotInstructions) {
            destination.write(instruction);
          }
        }
        if (isPage || renderer?.name === "astro:jsx") {
          destination.write(html);
        } else if (html && html.length > 0) {
          destination.write(
            markHTMLString(removeStaticAstroSlot(html, renderer?.ssr?.supportsAstroStaticSlot))
          );
        }
      }
    };
  }
  const astroId = shorthash(
    `<!--${metadata.componentExport.value}:${metadata.componentUrl}-->
${html}
${serializeProps(
      props,
      metadata
    )}`
  );
  const island = await generateHydrateScript(
    { renderer, result, astroId, props, attrs },
    metadata
  );
  if (componentServerRenderEndTime && process.env.NODE_ENV === "development")
    island.props["server-render-time"] = componentServerRenderEndTime;
  let unrenderedSlots = [];
  if (html) {
    if (Object.keys(children).length > 0) {
      for (const key of Object.keys(children)) {
        let tagName = renderer?.ssr?.supportsAstroStaticSlot ? !!metadata.hydrate ? "astro-slot" : "astro-static-slot" : "astro-slot";
        let expectedHTML = key === "default" ? `<${tagName}>` : `<${tagName} name="${key}">`;
        if (!html.includes(expectedHTML)) {
          unrenderedSlots.push(key);
        }
      }
    }
  } else {
    unrenderedSlots = Object.keys(children);
  }
  const template = unrenderedSlots.length > 0 ? unrenderedSlots.map(
    (key) => `<template data-astro-template${key !== "default" ? `="${key}"` : ""}>${children[key]}</template>`
  ).join("") : "";
  island.children = `${html ?? ""}${template}`;
  if (island.children) {
    island.props["await-children"] = "";
    island.children += `<!--astro:end-->`;
  }
  return {
    render(destination) {
      if (slotInstructions) {
        for (const instruction of slotInstructions) {
          destination.write(instruction);
        }
      }
      destination.write(createRenderInstruction({ type: "directive", hydration }));
      if (hydration.directive !== "only" && renderer?.ssr.renderHydrationScript) {
        destination.write(
          createRenderInstruction({
            type: "renderer-hydration-script",
            rendererName: renderer.name,
            render: renderer.ssr.renderHydrationScript
          })
        );
      }
      const renderedElement = renderElement$1("astro-island", island, false);
      destination.write(markHTMLString(renderedElement));
    }
  };
}
function sanitizeElementName(tag) {
  const unsafe = /[&<>'"\s]+/;
  if (!unsafe.test(tag)) return tag;
  return tag.trim().split(unsafe)[0].trim();
}
function renderFragmentComponent(result, slots = {}) {
  const slot = slots?.default;
  return {
    render(destination) {
      if (slot == null) return;
      return renderSlot(result, slot).render(destination);
    }
  };
}
async function renderHTMLComponent(result, Component, _props, slots = {}) {
  const { slotInstructions, children } = await renderSlots(result, slots);
  const html = Component({ slots: children });
  const hydrationHtml = slotInstructions ? slotInstructions.map((instr) => chunkToString(result, instr)).join("") : "";
  return {
    render(destination) {
      destination.write(markHTMLString(hydrationHtml + html));
    }
  };
}
function renderAstroComponent(result, displayName, Component, props, slots = {}) {
  if (containsServerDirective(props)) {
    const serverIslandComponent = new ServerIslandComponent(result, props, slots, displayName);
    result._metadata.propagators.add(serverIslandComponent);
    return serverIslandComponent;
  }
  const instance = createAstroComponentInstance(result, displayName, Component, props, slots);
  return {
    render(destination) {
      return instance.render(destination);
    }
  };
}
function renderComponent(result, displayName, Component, props, slots = {}) {
  if (isPromise(Component)) {
    return Component.catch(handleCancellation).then((x) => {
      return renderComponent(result, displayName, x, props, slots);
    });
  }
  if (isFragmentComponent(Component)) {
    return renderFragmentComponent(result, slots);
  }
  props = normalizeProps(props);
  if (isHTMLComponent(Component)) {
    return renderHTMLComponent(result, Component, props, slots).catch(handleCancellation);
  }
  if (isAstroComponentFactory(Component)) {
    return renderAstroComponent(result, displayName, Component, props, slots);
  }
  return renderFrameworkComponent(result, displayName, Component, props, slots).catch(
    handleCancellation
  );
  function handleCancellation(e) {
    if (result.cancelled)
      return {
        render() {
        }
      };
    throw e;
  }
}
function normalizeProps(props) {
  if (props["class:list"] !== void 0) {
    const value = props["class:list"];
    delete props["class:list"];
    props["class"] = clsx(props["class"], value);
    if (props["class"] === "") {
      delete props["class"];
    }
  }
  return props;
}
async function renderComponentToString(result, displayName, Component, props, slots = {}, isPage = false, route) {
  let str = "";
  let renderedFirstPageChunk = false;
  let head = "";
  if (isPage && !result.partial && nonAstroPageNeedsHeadInjection(Component)) {
    head += chunkToString(result, maybeRenderHead());
  }
  try {
    const destination = {
      write(chunk) {
        if (isPage && !result.partial && !renderedFirstPageChunk) {
          renderedFirstPageChunk = true;
          if (!/<!doctype html/i.test(String(chunk))) {
            const doctype = result.compressHTML ? "<!DOCTYPE html>" : "<!DOCTYPE html>\n";
            str += doctype + head;
          }
        }
        if (chunk instanceof Response) return;
        str += chunkToString(result, chunk);
      }
    };
    const renderInstance = await renderComponent(result, displayName, Component, props, slots);
    if (containsServerDirective(props)) {
      await bufferHeadContent(result);
    }
    await renderInstance.render(destination);
  } catch (e) {
    if (AstroError.is(e) && !e.loc) {
      e.setLocation({
        file: route?.component
      });
    }
    throw e;
  }
  return str;
}
function nonAstroPageNeedsHeadInjection(pageComponent) {
  return !!pageComponent?.[needsHeadRenderingSymbol];
}

const ClientOnlyPlaceholder$1 = "astro-client-only";
const hasTriedRenderComponentSymbol = /* @__PURE__ */ Symbol("hasTriedRenderComponent");
async function renderJSX(result, vnode) {
  switch (true) {
    case vnode instanceof HTMLString:
      if (vnode.toString().trim() === "") {
        return "";
      }
      return vnode;
    case typeof vnode === "string":
      return markHTMLString(escapeHTML(vnode));
    case typeof vnode === "function":
      return vnode;
    case (!vnode && vnode !== 0):
      return "";
    case Array.isArray(vnode): {
      const renderedItems = await Promise.all(vnode.map((v) => renderJSX(result, v)));
      let instructions = null;
      let content = "";
      for (const item of renderedItems) {
        if (item instanceof SlotString) {
          content += item;
          instructions = mergeSlotInstructions(instructions, item);
        } else {
          content += item;
        }
      }
      if (instructions) {
        return markHTMLString(new SlotString(content, instructions));
      }
      return markHTMLString(content);
    }
  }
  return renderJSXVNode(result, vnode);
}
async function renderJSXVNode(result, vnode) {
  if (isVNode(vnode)) {
    switch (true) {
      case !vnode.type: {
        throw new Error(`Unable to render ${result.pathname} because it contains an undefined Component!
Did you forget to import the component or is it possible there is a typo?`);
      }
      case vnode.type === /* @__PURE__ */ Symbol.for("astro:fragment"):
        return renderJSX(result, vnode.props.children);
      case isAstroComponentFactory(vnode.type): {
        let props = {};
        let slots = {};
        for (const [key, value] of Object.entries(vnode.props ?? {})) {
          if (key === "children" || value && typeof value === "object" && value["$$slot"]) {
            slots[key === "children" ? "default" : key] = () => renderJSX(result, value);
          } else {
            props[key] = value;
          }
        }
        const str = await renderComponentToString(
          result,
          vnode.type.name,
          vnode.type,
          props,
          slots
        );
        const html = markHTMLString(str);
        return html;
      }
      case (!vnode.type && vnode.type !== 0):
        return "";
      case (typeof vnode.type === "string" && vnode.type !== ClientOnlyPlaceholder$1):
        return markHTMLString(await renderElement(result, vnode.type, vnode.props ?? {}));
    }
    if (vnode.type) {
      let extractSlots2 = function(child) {
        if (Array.isArray(child)) {
          return child.map((c) => extractSlots2(c));
        }
        if (!isVNode(child)) {
          _slots.default.push(child);
          return;
        }
        if ("slot" in child.props) {
          _slots[child.props.slot] = [..._slots[child.props.slot] ?? [], child];
          delete child.props.slot;
          return;
        }
        _slots.default.push(child);
      };
      if (typeof vnode.type === "function" && vnode.props["server:root"]) {
        const output2 = await vnode.type(vnode.props ?? {});
        return await renderJSX(result, output2);
      }
      if (typeof vnode.type === "function") {
        if (vnode.props[hasTriedRenderComponentSymbol]) {
          delete vnode.props[hasTriedRenderComponentSymbol];
          const output2 = await vnode.type(vnode.props ?? {});
          if (output2?.[AstroJSX] || !output2) {
            return await renderJSXVNode(result, output2);
          } else {
            return;
          }
        } else {
          vnode.props[hasTriedRenderComponentSymbol] = true;
        }
      }
      const { children = null, ...props } = vnode.props ?? {};
      const _slots = {
        default: []
      };
      extractSlots2(children);
      for (const [key, value] of Object.entries(props)) {
        if (value?.["$$slot"]) {
          _slots[key] = value;
          delete props[key];
        }
      }
      const slotPromises = [];
      const slots = {};
      for (const [key, value] of Object.entries(_slots)) {
        slotPromises.push(
          renderJSX(result, value).then((output2) => {
            if (output2.toString().trim().length === 0) return;
            slots[key] = () => output2;
          })
        );
      }
      await Promise.all(slotPromises);
      let output;
      if (vnode.type === ClientOnlyPlaceholder$1 && vnode.props["client:only"]) {
        output = await renderComponentToString(
          result,
          vnode.props["client:display-name"] ?? "",
          null,
          props,
          slots
        );
      } else {
        output = await renderComponentToString(
          result,
          typeof vnode.type === "function" ? vnode.type.name : vnode.type,
          vnode.type,
          props,
          slots
        );
      }
      return markHTMLString(output);
    }
  }
  return markHTMLString(`${vnode}`);
}
async function renderElement(result, tag, { children, ...props }) {
  return markHTMLString(
    `<${tag}${spreadAttributes(props)}${markHTMLString(
      (children == null || children === "") && voidElementNames.test(tag) ? `/>` : `>${children == null ? "" : await renderJSX(result, prerenderElementChildren$1(tag, children))}</${tag}>`
    )}`
  );
}
function prerenderElementChildren$1(tag, children) {
  if (typeof children === "string" && (tag === "style" || tag === "script")) {
    return markHTMLString(children);
  } else {
    return children;
  }
}

const ClientOnlyPlaceholder = "astro-client-only";
function renderJSXToQueue(vnode, result, queue, pool, stack, parent, metadata) {
  if (vnode instanceof HTMLString) {
    const html = vnode.toString();
    if (html.trim() === "") return;
    const node = pool.acquire("html-string", html);
    node.html = html;
    queue.nodes.push(node);
    return;
  }
  if (typeof vnode === "string") {
    const node = pool.acquire("text", vnode);
    node.content = vnode;
    queue.nodes.push(node);
    return;
  }
  if (typeof vnode === "number" || typeof vnode === "boolean") {
    const str = String(vnode);
    const node = pool.acquire("text", str);
    node.content = str;
    queue.nodes.push(node);
    return;
  }
  if (vnode == null || vnode === false) {
    return;
  }
  if (Array.isArray(vnode)) {
    for (let i = vnode.length - 1; i >= 0; i = i - 1) {
      stack.push({ node: vnode[i], parent, metadata });
    }
    return;
  }
  if (!isVNode(vnode)) {
    const str = String(vnode);
    const node = pool.acquire("text", str);
    node.content = str;
    queue.nodes.push(node);
    return;
  }
  handleVNode(vnode, result, queue, pool, stack, parent, metadata);
}
function handleVNode(vnode, result, queue, pool, stack, parent, metadata) {
  if (!vnode.type) {
    throw new Error(
      `Unable to render ${result.pathname} because it contains an undefined Component!
Did you forget to import the component or is it possible there is a typo?`
    );
  }
  if (vnode.type === /* @__PURE__ */ Symbol.for("astro:fragment")) {
    stack.push({ node: vnode.props?.children, parent, metadata });
    return;
  }
  if (isAstroComponentFactory(vnode.type)) {
    const factory = vnode.type;
    let props = {};
    let slots = {};
    for (const [key, value] of Object.entries(vnode.props ?? {})) {
      if (key === "children" || value && typeof value === "object" && value["$$slot"]) {
        slots[key === "children" ? "default" : key] = () => renderJSX(result, value);
      } else {
        props[key] = value;
      }
    }
    const displayName = metadata?.displayName || factory.name || "Anonymous";
    const instance = createAstroComponentInstance(result, displayName, factory, props, slots);
    const queueNode = pool.acquire("component");
    queueNode.instance = instance;
    queue.nodes.push(queueNode);
    return;
  }
  if (typeof vnode.type === "string" && vnode.type !== ClientOnlyPlaceholder) {
    renderHTMLElement(vnode, result, queue, pool, stack, parent, metadata);
    return;
  }
  if (typeof vnode.type === "function") {
    if (vnode.props?.["server:root"]) {
      const output3 = vnode.type(vnode.props ?? {});
      stack.push({ node: output3, parent, metadata });
      return;
    }
    const output2 = vnode.type(vnode.props ?? {});
    stack.push({ node: output2, parent, metadata });
    return;
  }
  const output = renderJSX(result, vnode);
  stack.push({ node: output, parent, metadata });
}
function renderHTMLElement(vnode, _result, queue, pool, stack, parent, metadata) {
  const tag = vnode.type;
  const { children, ...props } = vnode.props ?? {};
  const attrs = spreadAttributes(props);
  const isVoidElement = (children == null || children === "") && voidElementNames.test(tag);
  if (isVoidElement) {
    const html = `<${tag}${attrs}/>`;
    const node = pool.acquire("html-string", html);
    node.html = html;
    queue.nodes.push(node);
    return;
  }
  const openTag = `<${tag}${attrs}>`;
  const openTagHtml = queue.htmlStringCache ? queue.htmlStringCache.getOrCreate(openTag) : markHTMLString(openTag);
  stack.push({ node: openTagHtml, parent, metadata });
  if (children != null && children !== "") {
    const processedChildren = prerenderElementChildren(tag, children, queue.htmlStringCache);
    stack.push({ node: processedChildren, parent, metadata });
  }
  const closeTag = `</${tag}>`;
  const closeTagHtml = queue.htmlStringCache ? queue.htmlStringCache.getOrCreate(closeTag) : markHTMLString(closeTag);
  stack.push({ node: closeTagHtml, parent, metadata });
}
function prerenderElementChildren(tag, children, htmlStringCache) {
  if (typeof children === "string" && (tag === "style" || tag === "script")) {
    return htmlStringCache ? htmlStringCache.getOrCreate(children) : markHTMLString(children);
  }
  return children;
}

async function buildRenderQueue(root, result, pool) {
  const queue = {
    nodes: [],
    result,
    pool,
    htmlStringCache: result._experimentalQueuedRendering?.htmlStringCache
  };
  const stack = [{ node: root, parent: null }];
  while (stack.length > 0) {
    const item = stack.pop();
    if (!item) {
      continue;
    }
    let { node, parent } = item;
    if (isPromise(node)) {
      try {
        const resolved = await node;
        stack.push({ node: resolved, parent, metadata: item.metadata });
      } catch (error) {
        throw error;
      }
      continue;
    }
    if (node == null || node === false) {
      continue;
    }
    if (typeof node === "string") {
      const queueNode = pool.acquire("text", node);
      queueNode.content = node;
      queue.nodes.push(queueNode);
      continue;
    }
    if (typeof node === "number" || typeof node === "boolean") {
      const str = String(node);
      const queueNode = pool.acquire("text", str);
      queueNode.content = str;
      queue.nodes.push(queueNode);
      continue;
    }
    if (isHTMLString(node)) {
      const html = node.toString();
      const queueNode = pool.acquire("html-string", html);
      queueNode.html = html;
      queue.nodes.push(queueNode);
      continue;
    }
    if (node instanceof SlotString) {
      const html = node.toString();
      const queueNode = pool.acquire("html-string", html);
      queueNode.html = html;
      queue.nodes.push(queueNode);
      continue;
    }
    if (isVNode(node)) {
      renderJSXToQueue(node, result, queue, pool, stack, parent, item.metadata);
      continue;
    }
    if (Array.isArray(node)) {
      for (const n of node) {
        stack.push({ node: n, parent, metadata: item.metadata });
      }
      continue;
    }
    if (isRenderInstruction(node)) {
      const queueNode = pool.acquire("instruction");
      queueNode.instruction = node;
      queue.nodes.push(queueNode);
      continue;
    }
    if (isRenderTemplateResult(node)) {
      const htmlParts = node["htmlParts"];
      const expressions = node["expressions"];
      if (htmlParts[0]) {
        const htmlString = queue.htmlStringCache ? queue.htmlStringCache.getOrCreate(htmlParts[0]) : markHTMLString(htmlParts[0]);
        stack.push({
          node: htmlString,
          parent,
          metadata: item.metadata
        });
      }
      for (let i = 0; i < expressions.length; i = i + 1) {
        stack.push({ node: expressions[i], parent, metadata: item.metadata });
        if (htmlParts[i + 1]) {
          const htmlString = queue.htmlStringCache ? queue.htmlStringCache.getOrCreate(htmlParts[i + 1]) : markHTMLString(htmlParts[i + 1]);
          stack.push({
            node: htmlString,
            parent,
            metadata: item.metadata
          });
        }
      }
      continue;
    }
    if (isAstroComponentInstance(node)) {
      const queueNode = pool.acquire("component");
      queueNode.instance = node;
      queue.nodes.push(queueNode);
      continue;
    }
    if (isAstroComponentFactory(node)) {
      const factory = node;
      const props = item.metadata?.props || {};
      const slots = item.metadata?.slots || {};
      const displayName = item.metadata?.displayName || factory.name || "Anonymous";
      const instance = createAstroComponentInstance(result, displayName, factory, props, slots);
      const queueNode = pool.acquire("component");
      queueNode.instance = instance;
      if (isAPropagatingComponent(result, factory)) {
        try {
          const returnValue = await instance.init(result);
          if (isHeadAndContent(returnValue) && returnValue.head) {
            result._metadata.extraHead.push(returnValue.head);
          }
        } catch (error) {
          throw error;
        }
      }
      queue.nodes.push(queueNode);
      continue;
    }
    if (isRenderInstance(node)) {
      const queueNode = pool.acquire("component");
      queueNode.instance = node;
      queue.nodes.push(queueNode);
      continue;
    }
    if (typeof node === "object" && Symbol.iterator in node) {
      const items = Array.from(node);
      for (const iterItem of items) {
        stack.push({ node: iterItem, parent, metadata: item.metadata });
      }
      continue;
    }
    if (typeof node === "object" && Symbol.asyncIterator in node) {
      try {
        const items = [];
        for await (const asyncItem of node) {
          items.push(asyncItem);
        }
        for (const iterItem of items) {
          stack.push({ node: iterItem, parent, metadata: item.metadata });
        }
      } catch (error) {
        throw error;
      }
      continue;
    }
    if (node instanceof Response) {
      const queueNode = pool.acquire("html-string", "");
      queueNode.html = "";
      queue.nodes.push(queueNode);
      continue;
    }
    if (isHTMLString(node)) {
      const html = String(node);
      const queueNode = pool.acquire("html-string", html);
      queueNode.html = html;
      queue.nodes.push(queueNode);
    } else {
      const str = String(node);
      const queueNode = pool.acquire("text", str);
      queueNode.content = str;
      queue.nodes.push(queueNode);
    }
  }
  queue.nodes.reverse();
  return queue;
}

async function renderQueue(queue, destination) {
  const result = queue.result;
  const pool = queue.pool;
  const cache = queue.htmlStringCache;
  let batchBuffer = "";
  let i = 0;
  while (i < queue.nodes.length) {
    const node = queue.nodes[i];
    try {
      if (canBatch(node)) {
        const batchStart = i;
        while (i < queue.nodes.length && canBatch(queue.nodes[i])) {
          batchBuffer += renderNodeToString(queue.nodes[i]);
          i = i + 1;
        }
        if (batchBuffer) {
          const htmlString = cache ? cache.getOrCreate(batchBuffer) : markHTMLString(batchBuffer);
          destination.write(htmlString);
          batchBuffer = "";
        }
        if (pool) {
          for (let j = batchStart; j < i; j++) {
            pool.release(queue.nodes[j]);
          }
        }
      } else {
        await renderNode(node, destination, result);
        if (pool) {
          pool.release(node);
        }
        i = i + 1;
      }
    } catch (error) {
      throw error;
    }
  }
  if (batchBuffer) {
    const htmlString = cache ? cache.getOrCreate(batchBuffer) : markHTMLString(batchBuffer);
    destination.write(htmlString);
  }
}
function canBatch(node) {
  return node.type === "text" || node.type === "html-string";
}
function renderNodeToString(node) {
  switch (node.type) {
    case "text":
      return node.content ? escapeHTML(node.content) : "";
    case "html-string":
      return node.html || "";
    case "component":
    case "instruction": {
      return "";
    }
  }
}
async function renderNode(node, destination, result) {
  const cache = result._experimentalQueuedRendering?.htmlStringCache;
  switch (node.type) {
    case "text": {
      if (node.content) {
        const escaped = escapeHTML(node.content);
        const htmlString = cache ? cache.getOrCreate(escaped) : markHTMLString(escaped);
        destination.write(htmlString);
      }
      break;
    }
    case "html-string": {
      if (node.html) {
        const htmlString = cache ? cache.getOrCreate(node.html) : markHTMLString(node.html);
        destination.write(htmlString);
      }
      break;
    }
    case "instruction": {
      if (node.instruction) {
        destination.write(node.instruction);
      }
      break;
    }
    case "component": {
      if (node.instance) {
        let componentHtml = "";
        const componentDestination = {
          write(chunk) {
            if (chunk instanceof Response) return;
            componentHtml += chunkToString(result, chunk);
          }
        };
        await node.instance.render(componentDestination);
        if (componentHtml) {
          destination.write(componentHtml);
        }
      }
      break;
    }
  }
}

async function renderPage(result, componentFactory, props, children, streaming, route) {
  if (!isAstroComponentFactory(componentFactory)) {
    result._metadata.headInTree = result.componentMetadata.get(componentFactory.moduleId)?.containsHead ?? false;
    const pageProps = { ...props ?? {}, "server:root": true };
    let str;
    if (result._experimentalQueuedRendering && result._experimentalQueuedRendering.enabled) {
      let vnode = await componentFactory(pageProps);
      if (componentFactory["astro:html"] && typeof vnode === "string") {
        vnode = markHTMLString(vnode);
      }
      const queue = await buildRenderQueue(
        vnode,
        result,
        result._experimentalQueuedRendering.pool
      );
      let html = "";
      let renderedFirst = false;
      const destination = {
        write(chunk) {
          if (chunk instanceof Response) return;
          if (!renderedFirst && !result.partial) {
            renderedFirst = true;
            const chunkStr = String(chunk);
            if (!/<!doctype html/i.test(chunkStr)) {
              const doctype = result.compressHTML ? "<!DOCTYPE html>" : "<!DOCTYPE html>\n";
              html += doctype;
            }
          }
          html += chunkToString(result, chunk);
        }
      };
      await renderQueue(queue, destination);
      str = html;
    } else {
      str = await renderComponentToString(
        result,
        componentFactory.name,
        componentFactory,
        pageProps,
        {},
        true,
        route
      );
    }
    const bytes = encoder.encode(str);
    const headers2 = new Headers([
      ["Content-Type", "text/html"],
      ["Content-Length", bytes.byteLength.toString()]
    ]);
    if (result.shouldInjectCspMetaTags && (result.cspDestination === "header" || result.cspDestination === "adapter")) {
      headers2.set("content-security-policy", renderCspContent(result));
    }
    return new Response(bytes, {
      headers: headers2,
      status: result.response.status
    });
  }
  result._metadata.headInTree = result.componentMetadata.get(componentFactory.moduleId)?.containsHead ?? false;
  let body;
  if (streaming) {
    if (isNode && !isDeno) {
      const nodeBody = await renderToAsyncIterable(
        result,
        componentFactory,
        props,
        children,
        true,
        route
      );
      body = nodeBody;
    } else {
      body = await renderToReadableStream(result, componentFactory, props, children, true, route);
    }
  } else {
    body = await renderToString(result, componentFactory, props, children, true, route);
  }
  if (body instanceof Response) return body;
  const init = result.response;
  const headers = new Headers(init.headers);
  if (result.shouldInjectCspMetaTags && result.cspDestination === "header" || result.cspDestination === "adapter") {
    headers.set("content-security-policy", renderCspContent(result));
  }
  if (!streaming && typeof body === "string") {
    body = encoder.encode(body);
    headers.set("Content-Length", body.byteLength.toString());
  }
  let status = init.status;
  let statusText = init.statusText;
  if (route?.route === "/404") {
    status = 404;
    if (statusText === "OK") {
      statusText = "Not Found";
    }
  } else if (route?.route === "/500") {
    status = 500;
    if (statusText === "OK") {
      statusText = "Internal Server Error";
    }
  }
  if (status) {
    return new Response(body, { ...init, headers, status, statusText });
  } else {
    return new Response(body, { ...init, headers });
  }
}

"0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_".split("").reduce((v, c) => (v[c.charCodeAt(0)] = c, v), []);
"-0123456789_".split("").reduce((v, c) => (v[c.charCodeAt(0)] = c, v), []);

function spreadAttributes(values = {}, _name, { class: scopedClassName } = {}) {
  let output = "";
  if (scopedClassName) {
    if (typeof values.class !== "undefined") {
      values.class += ` ${scopedClassName}`;
    } else if (typeof values["class:list"] !== "undefined") {
      values["class:list"] = [values["class:list"], scopedClassName];
    } else {
      values.class = scopedClassName;
    }
  }
  for (const [key, value] of Object.entries(values)) {
    output += addAttribute(value, key, true, _name);
  }
  return markHTMLString(output);
}

function getPattern(segments, base, addTrailingSlash) {
  const pathname = segments.map((segment) => {
    if (segment.length === 1 && segment[0].spread) {
      return "(?:\\/(.*?))?";
    } else {
      return "\\/" + segment.map((part) => {
        if (part.spread) {
          return "(.*?)";
        } else if (part.dynamic) {
          return "([^/]+?)";
        } else {
          return part.content.normalize().replace(/\?/g, "%3F").replace(/#/g, "%23").replace(/%5B/g, "[").replace(/%5D/g, "]").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        }
      }).join("");
    }
  }).join("");
  const trailing = addTrailingSlash && segments.length ? getTrailingSlashPattern(addTrailingSlash) : "$";
  let initial = "\\/";
  if (addTrailingSlash === "never" && base !== "/" && pathname !== "") {
    initial = "";
  }
  return new RegExp(`^${pathname || initial}${trailing}`);
}
function getTrailingSlashPattern(addTrailingSlash) {
  if (addTrailingSlash === "always") {
    return "\\/$";
  }
  if (addTrailingSlash === "never") {
    return "$";
  }
  return "\\/?$";
}

const SERVER_ISLAND_ROUTE = "/_server-islands/[name]";
const SERVER_ISLAND_COMPONENT = "_server-islands.astro";
function badRequest(reason) {
  return new Response(null, {
    status: 400,
    statusText: "Bad request: " + reason
  });
}
const DEFAULT_BODY_SIZE_LIMIT = 1024 * 1024;
async function getRequestData(request, bodySizeLimit = DEFAULT_BODY_SIZE_LIMIT) {
  switch (request.method) {
    case "GET": {
      const url = new URL(request.url);
      const params = url.searchParams;
      if (!params.has("s") || !params.has("e") || !params.has("p")) {
        return badRequest("Missing required query parameters.");
      }
      const encryptedSlots = params.get("s");
      return {
        encryptedComponentExport: params.get("e"),
        encryptedProps: params.get("p"),
        encryptedSlots
      };
    }
    case "POST": {
      try {
        const body = await readBodyWithLimit(request, bodySizeLimit);
        const raw = new TextDecoder().decode(body);
        const data = JSON.parse(raw);
        if (Object.hasOwn(data, "slots") && typeof data.slots === "object") {
          return badRequest("Plaintext slots are not allowed. Slots must be encrypted.");
        }
        if (Object.hasOwn(data, "componentExport") && typeof data.componentExport === "string") {
          return badRequest(
            "Plaintext componentExport is not allowed. componentExport must be encrypted."
          );
        }
        return data;
      } catch (e) {
        if (e instanceof BodySizeLimitError) {
          return new Response(null, {
            status: 413,
            statusText: e.message
          });
        }
        if (e instanceof SyntaxError) {
          return badRequest("Request format is invalid.");
        }
        throw e;
      }
    }
    default: {
      return new Response(null, { status: 405 });
    }
  }
}
function createEndpoint(manifest) {
  const page = async (result) => {
    const params = result.params;
    if (!params.name) {
      return new Response(null, {
        status: 400,
        statusText: "Bad request"
      });
    }
    const componentId = params.name;
    const data = await getRequestData(result.request, manifest.serverIslandBodySizeLimit);
    if (data instanceof Response) {
      return data;
    }
    const serverIslandMappings = await manifest.serverIslandMappings?.();
    const serverIslandMap = await serverIslandMappings?.serverIslandMap;
    let imp = serverIslandMap?.get(componentId);
    if (!imp) {
      return new Response(null, {
        status: 404,
        statusText: "Not found"
      });
    }
    const key = await manifest.key;
    let componentExport;
    try {
      componentExport = await decryptString(
        key,
        data.encryptedComponentExport,
        `export:${componentId}`
      );
    } catch (_e) {
      return badRequest("Encrypted componentExport value is invalid.");
    }
    const encryptedProps = data.encryptedProps;
    let props = {};
    if (encryptedProps !== "") {
      try {
        const propString = await decryptString(key, encryptedProps, `props:${componentId}`);
        props = JSON.parse(propString);
      } catch (_e) {
        return badRequest("Encrypted props value is invalid.");
      }
    }
    let decryptedSlots = {};
    const encryptedSlots = data.encryptedSlots;
    if (encryptedSlots !== "") {
      try {
        const slotsString = await decryptString(key, encryptedSlots, `slots:${componentId}`);
        decryptedSlots = JSON.parse(slotsString);
      } catch (_e) {
        return badRequest("Encrypted slots value is invalid.");
      }
    }
    const componentModule = await imp();
    let Component = componentModule[componentExport];
    const slots = {};
    for (const prop in decryptedSlots) {
      slots[prop] = createSlotValueFromString(decryptedSlots[prop]);
    }
    result.response.headers.set("X-Robots-Tag", "noindex");
    if (isAstroComponentFactory(Component)) {
      const ServerIsland = Component;
      Component = function(...args) {
        return ServerIsland.apply(this, args);
      };
      Object.assign(Component, ServerIsland);
      Component.propagation = "self";
    }
    return renderTemplate`${renderComponent(result, "Component", Component, props, slots)}`;
  };
  page.isAstroComponentFactory = true;
  const instance = {
    default: page,
    partial: true
  };
  return instance;
}

function createDefaultRoutes(manifest) {
  const root = new URL(manifest.rootDir);
  return [
    {
      instance: default404Instance,
      matchesComponent: (filePath) => filePath.href === new URL(DEFAULT_404_COMPONENT, root).href,
      route: DEFAULT_404_ROUTE.route,
      component: DEFAULT_404_COMPONENT
    },
    {
      instance: createEndpoint(manifest),
      matchesComponent: (filePath) => filePath.href === new URL(SERVER_ISLAND_COMPONENT, root).href,
      route: SERVER_ISLAND_ROUTE,
      component: SERVER_ISLAND_COMPONENT
    }
  ];
}

function ensure404Route(manifest) {
  if (!manifest.routes.some((route) => route.route === "/404")) {
    manifest.routes.push(DEFAULT_404_ROUTE);
  }
  return manifest;
}

function routeIsRedirect(route) {
  return route?.type === "redirect";
}
function routeIsFallback(route) {
  return route?.type === "fallback";
}
function getFallbackRoute(route, routeList) {
  const fallbackRoute = routeList.find((r) => {
    if (route.route === "/" && r.routeData.route === "/") {
      return true;
    }
    return r.routeData.fallbackRoutes.find((f) => {
      return f.route === route.route;
    });
  });
  if (!fallbackRoute) {
    throw new Error(`No fallback route found for route ${route.route}`);
  }
  return fallbackRoute.routeData;
}
function routeHasHtmlExtension(route) {
  return route.segments.some(
    (segment) => segment.some((part) => !part.dynamic && part.content.includes(".html"))
  );
}

async function getProps(opts) {
  const {
    logger,
    mod,
    routeData: route,
    routeCache,
    pathname,
    serverLike,
    base,
    trailingSlash
  } = opts;
  if (!route || route.pathname) {
    return {};
  }
  if (routeIsRedirect(route) || routeIsFallback(route) || route.component === DEFAULT_404_COMPONENT) {
    return {};
  }
  const staticPaths = await callGetStaticPaths({
    mod,
    route,
    routeCache,
    ssr: serverLike,
    base,
    trailingSlash
  });
  const params = getParams(route, pathname);
  const matchedStaticPath = findPathItemByKey(staticPaths, params, route, logger, trailingSlash);
  if (!matchedStaticPath && (serverLike ? route.prerender : true)) {
    throw new AstroError({
      ...NoMatchingStaticPathFound,
      message: NoMatchingStaticPathFound.message(pathname),
      hint: NoMatchingStaticPathFound.hint([route.component])
    });
  }
  if (mod) {
    validatePrerenderEndpointCollision(route, mod, params);
  }
  const props = matchedStaticPath?.props ? { ...matchedStaticPath.props } : {};
  return props;
}
function getParams(route, pathname) {
  if (!route.params.length) return {};
  const path = pathname.endsWith(".html") && route.type === "page" && !routeHasHtmlExtension(route) ? pathname.slice(0, -5) : pathname;
  const allPatterns = [route, ...route.fallbackRoutes].map((r) => r.pattern);
  const paramsMatch = allPatterns.map((pattern) => pattern.exec(path)).find((x) => x);
  if (!paramsMatch) return {};
  const params = {};
  route.params.forEach((key, i) => {
    if (key.startsWith("...")) {
      params[key.slice(3)] = paramsMatch[i + 1] ? paramsMatch[i + 1] : void 0;
    } else {
      params[key] = paramsMatch[i + 1];
    }
  });
  return params;
}
function validatePrerenderEndpointCollision(route, mod, params) {
  if (route.type === "endpoint" && mod.getStaticPaths) {
    const lastSegment = route.segments[route.segments.length - 1];
    const paramValues = Object.values(params);
    const lastParam = paramValues[paramValues.length - 1];
    if (lastSegment.length === 1 && lastSegment[0].dynamic && lastParam === void 0) {
      throw new AstroError({
        ...PrerenderDynamicEndpointPathCollide,
        message: PrerenderDynamicEndpointPathCollide.message(route.route),
        hint: PrerenderDynamicEndpointPathCollide.hint(route.component),
        location: {
          file: route.component
        }
      });
    }
  }
}

function routeComparator(a, b) {
  const commonLength = Math.min(a.segments.length, b.segments.length);
  for (let index = 0; index < commonLength; index++) {
    const aSegment = a.segments[index];
    const bSegment = b.segments[index];
    const aIsStatic = aSegment.every((part) => !part.dynamic && !part.spread);
    const bIsStatic = bSegment.every((part) => !part.dynamic && !part.spread);
    if (aIsStatic && bIsStatic) {
      const aContent = aSegment.map((part) => part.content).join("");
      const bContent = bSegment.map((part) => part.content).join("");
      if (aContent !== bContent) {
        return aContent.localeCompare(bContent);
      }
    }
    if (aIsStatic !== bIsStatic) {
      return aIsStatic ? -1 : 1;
    }
    const aAllDynamic = aSegment.every((part) => part.dynamic);
    const bAllDynamic = bSegment.every((part) => part.dynamic);
    if (aAllDynamic !== bAllDynamic) {
      return aAllDynamic ? 1 : -1;
    }
    const aHasSpread = aSegment.some((part) => part.spread);
    const bHasSpread = bSegment.some((part) => part.spread);
    if (aHasSpread !== bHasSpread) {
      return aHasSpread ? 1 : -1;
    }
  }
  const aLength = a.segments.length;
  const bLength = b.segments.length;
  if (aLength !== bLength) {
    const aEndsInRest = a.segments.at(-1)?.some((part) => part.spread);
    const bEndsInRest = b.segments.at(-1)?.some((part) => part.spread);
    if (aEndsInRest !== bEndsInRest && Math.abs(aLength - bLength) === 1) {
      if (aLength > bLength && aEndsInRest) {
        return 1;
      }
      if (bLength > aLength && bEndsInRest) {
        return -1;
      }
    }
    return aLength > bLength ? -1 : 1;
  }
  if (a.type === "endpoint" !== (b.type === "endpoint")) {
    return a.type === "endpoint" ? -1 : 1;
  }
  return a.route.localeCompare(b.route);
}

class Router {
  #routes;
  #base;
  #baseWithoutTrailingSlash;
  #buildFormat;
  #trailingSlash;
  constructor(routes, options) {
    this.#routes = [...routes].sort(routeComparator);
    this.#base = normalizeBase(options.base);
    this.#baseWithoutTrailingSlash = removeTrailingForwardSlash(this.#base);
    this.#buildFormat = options.buildFormat;
    this.#trailingSlash = options.trailingSlash;
  }
  /**
   * Match an input pathname against the route list.
   * If allowWithoutBase is true, a non-base-prefixed path is still considered.
   */
  match(inputPathname, { allowWithoutBase = false } = {}) {
    const normalized = getRedirectForPathname(inputPathname);
    if (normalized.redirect) {
      return { type: "redirect", location: normalized.redirect, status: 301 };
    }
    if (this.#base !== "/") {
      const baseWithSlash = `${this.#baseWithoutTrailingSlash}/`;
      if (this.#trailingSlash === "always" && (normalized.pathname === this.#baseWithoutTrailingSlash || normalized.pathname === this.#base)) {
        return { type: "redirect", location: baseWithSlash, status: 301 };
      }
      if (this.#trailingSlash === "never" && normalized.pathname === baseWithSlash) {
        return { type: "redirect", location: this.#baseWithoutTrailingSlash, status: 301 };
      }
    }
    const baseResult = stripBase(
      normalized.pathname,
      this.#base,
      this.#baseWithoutTrailingSlash,
      this.#trailingSlash
    );
    if (!baseResult) {
      if (!allowWithoutBase) {
        return { type: "none", reason: "outside-base" };
      }
    }
    let pathname = baseResult ?? normalized.pathname;
    if (this.#buildFormat === "file") {
      pathname = normalizeFileFormatPathname(pathname);
    }
    const route = this.#routes.find((candidate) => {
      if (candidate.pattern.test(pathname)) return true;
      return candidate.fallbackRoutes.some((fallbackRoute) => fallbackRoute.pattern.test(pathname));
    });
    if (!route) {
      return { type: "none", reason: "no-match" };
    }
    const params = getParams(route, pathname);
    return { type: "match", route, params, pathname };
  }
}
function normalizeBase(base) {
  if (!base) return "/";
  if (base === "/") return base;
  return prependForwardSlash(base);
}
function getRedirectForPathname(pathname) {
  let value = prependForwardSlash(pathname);
  if (value.startsWith("//")) {
    const collapsed = `/${value.replace(/^\/+/, "")}`;
    return { pathname: value, redirect: collapsed };
  }
  return { pathname: value };
}
function stripBase(pathname, base, baseWithoutTrailingSlash, trailingSlash) {
  if (base === "/") return pathname;
  const baseWithSlash = `${baseWithoutTrailingSlash}/`;
  if (pathname === baseWithoutTrailingSlash || pathname === base) {
    return trailingSlash === "always" ? null : "/";
  }
  if (pathname === baseWithSlash) {
    return trailingSlash === "never" ? null : "/";
  }
  if (pathname.startsWith(baseWithSlash)) {
    return pathname.slice(baseWithoutTrailingSlash.length);
  }
  return null;
}
function normalizeFileFormatPathname(pathname) {
  if (pathname.endsWith("/index.html")) {
    const trimmed = pathname.slice(0, -"/index.html".length);
    return trimmed === "" ? "/" : trimmed;
  }
  if (pathname.endsWith(".html")) {
    const trimmed = pathname.slice(0, -".html".length);
    return trimmed === "" ? "/" : trimmed;
  }
  return pathname;
}

function deserializeManifest(serializedManifest, routesList) {
  const routes = [];
  if (serializedManifest.routes) {
    for (const serializedRoute of serializedManifest.routes) {
      routes.push({
        ...serializedRoute,
        routeData: deserializeRouteData(serializedRoute.routeData)
      });
      const route = serializedRoute;
      route.routeData = deserializeRouteData(serializedRoute.routeData);
    }
  }
  const assets = new Set(serializedManifest.assets);
  const componentMetadata = new Map(serializedManifest.componentMetadata);
  const inlinedScripts = new Map(serializedManifest.inlinedScripts);
  const clientDirectives = new Map(serializedManifest.clientDirectives);
  const key = decodeKey(serializedManifest.key);
  return {
    // in case user middleware exists, this no-op middleware will be reassigned (see plugin-ssr.ts)
    middleware() {
      return { onRequest: NOOP_MIDDLEWARE_FN };
    },
    ...serializedManifest,
    rootDir: new URL(serializedManifest.rootDir),
    srcDir: new URL(serializedManifest.srcDir),
    publicDir: new URL(serializedManifest.publicDir),
    outDir: new URL(serializedManifest.outDir),
    cacheDir: new URL(serializedManifest.cacheDir),
    buildClientDir: new URL(serializedManifest.buildClientDir),
    buildServerDir: new URL(serializedManifest.buildServerDir),
    assets,
    componentMetadata,
    inlinedScripts,
    clientDirectives,
    routes,
    key
  };
}
function deserializeRouteData(rawRouteData) {
  return {
    route: rawRouteData.route,
    type: rawRouteData.type,
    // nosemgrep: javascript.lang.security.audit.detect-non-literal-regexp.detect-non-literal-regexp
    // This pattern is serialized from Astro's own route manifest.
    pattern: new RegExp(rawRouteData.pattern),
    params: rawRouteData.params,
    component: rawRouteData.component,
    pathname: rawRouteData.pathname || void 0,
    segments: rawRouteData.segments,
    prerender: rawRouteData.prerender,
    redirect: rawRouteData.redirect,
    redirectRoute: rawRouteData.redirectRoute ? deserializeRouteData(rawRouteData.redirectRoute) : void 0,
    fallbackRoutes: rawRouteData.fallbackRoutes.map((fallback) => {
      return deserializeRouteData(fallback);
    }),
    isIndex: rawRouteData.isIndex,
    origin: rawRouteData.origin,
    distURL: rawRouteData.distURL
  };
}
function deserializeRouteInfo(rawRouteInfo) {
  return {
    styles: rawRouteInfo.styles,
    file: rawRouteInfo.file,
    links: rawRouteInfo.links,
    scripts: rawRouteInfo.scripts,
    routeData: deserializeRouteData(rawRouteInfo.routeData)
  };
}

class NodePool {
  textPool = [];
  htmlStringPool = [];
  componentPool = [];
  instructionPool = [];
  maxSize;
  enableStats;
  stats = {
    acquireFromPool: 0,
    acquireNew: 0,
    released: 0,
    releasedDropped: 0
  };
  /**
   * Creates a new object pool for queue nodes.
   *
   * @param maxSize - Maximum number of nodes to keep in the pool (default: 1000).
   *   The cap is shared across all typed sub-pools.
   * @param enableStats - Enable statistics tracking (default: false for performance)
   */
  constructor(maxSize = 1e3, enableStats = false) {
    this.maxSize = maxSize;
    this.enableStats = enableStats;
  }
  /**
   * Acquires a queue node from the pool or creates a new one if the pool is empty.
   * Pops from the type-specific sub-pool to reuse an existing object when available.
   *
   * @param type - The type of queue node to acquire
   * @param content - Optional content to set on the node (for text or html-string types)
   * @returns A queue node ready to be populated with data
   */
  acquire(type, content) {
    const pooledNode = this.popFromTypedPool(type);
    if (pooledNode) {
      if (this.enableStats) {
        this.stats.acquireFromPool = this.stats.acquireFromPool + 1;
      }
      this.resetNodeContent(pooledNode, type, content);
      return pooledNode;
    }
    if (this.enableStats) {
      this.stats.acquireNew = this.stats.acquireNew + 1;
    }
    return this.createNode(type, content);
  }
  /**
   * Creates a new node of the specified type with the given content.
   * Helper method to reduce branching in acquire().
   */
  createNode(type, content = "") {
    switch (type) {
      case "text":
        return { type: "text", content };
      case "html-string":
        return { type: "html-string", html: content };
      case "component":
        return { type: "component", instance: void 0 };
      case "instruction":
        return { type: "instruction", instruction: void 0 };
    }
  }
  /**
   * Pops a node from the type-specific sub-pool.
   * Returns undefined if the sub-pool for the requested type is empty.
   */
  popFromTypedPool(type) {
    switch (type) {
      case "text":
        return this.textPool.pop();
      case "html-string":
        return this.htmlStringPool.pop();
      case "component":
        return this.componentPool.pop();
      case "instruction":
        return this.instructionPool.pop();
    }
  }
  /**
   * Resets the content/value field on a reused pooled node.
   * The type discriminant is already correct since we pop from the matching sub-pool.
   */
  resetNodeContent(node, type, content) {
    switch (type) {
      case "text":
        node.content = content ?? "";
        break;
      case "html-string":
        node.html = content ?? "";
        break;
      case "component":
        node.instance = void 0;
        break;
      case "instruction":
        node.instruction = void 0;
        break;
    }
  }
  /**
   * Returns the total number of nodes across all typed sub-pools.
   */
  totalPoolSize() {
    return this.textPool.length + this.htmlStringPool.length + this.componentPool.length + this.instructionPool.length;
  }
  /**
   * Releases a queue node back to the pool for reuse.
   * If the pool is at max capacity, the node is discarded (will be GC'd).
   *
   * @param node - The node to release back to the pool
   */
  release(node) {
    if (this.totalPoolSize() >= this.maxSize) {
      if (this.enableStats) {
        this.stats.releasedDropped = this.stats.releasedDropped + 1;
      }
      return;
    }
    switch (node.type) {
      case "text":
        node.content = "";
        this.textPool.push(node);
        break;
      case "html-string":
        node.html = "";
        this.htmlStringPool.push(node);
        break;
      case "component":
        node.instance = void 0;
        this.componentPool.push(node);
        break;
      case "instruction":
        node.instruction = void 0;
        this.instructionPool.push(node);
        break;
    }
    if (this.enableStats) {
      this.stats.released = this.stats.released + 1;
    }
  }
  /**
   * Releases all nodes in an array back to the pool.
   * This is a convenience method for releasing multiple nodes at once.
   *
   * @param nodes - Array of nodes to release
   */
  releaseAll(nodes) {
    for (const node of nodes) {
      this.release(node);
    }
  }
  /**
   * Clears all typed sub-pools, discarding all cached nodes.
   * This can be useful if you want to free memory after a large render.
   */
  clear() {
    this.textPool.length = 0;
    this.htmlStringPool.length = 0;
    this.componentPool.length = 0;
    this.instructionPool.length = 0;
  }
  /**
   * Gets the current total number of nodes across all typed sub-pools.
   * Useful for monitoring pool usage and tuning maxSize.
   *
   * @returns Number of nodes currently available in the pool
   */
  size() {
    return this.totalPoolSize();
  }
  /**
   * Gets pool statistics for debugging.
   *
   * @returns Pool usage statistics including computed metrics
   */
  getStats() {
    return {
      ...this.stats,
      poolSize: this.totalPoolSize(),
      maxSize: this.maxSize,
      hitRate: this.stats.acquireFromPool + this.stats.acquireNew > 0 ? this.stats.acquireFromPool / (this.stats.acquireFromPool + this.stats.acquireNew) * 100 : 0
    };
  }
  /**
   * Resets pool statistics.
   */
  resetStats() {
    this.stats = {
      acquireFromPool: 0,
      acquireNew: 0,
      released: 0,
      releasedDropped: 0
    };
  }
}

class HTMLStringCache {
  cache = /* @__PURE__ */ new Map();
  maxSize;
  constructor(maxSize = 1e3) {
    this.maxSize = maxSize;
    this.warm(COMMON_HTML_PATTERNS);
  }
  /**
   * Get or create an HTMLString for the given content.
   * If cached, the existing object is returned and moved to end (most recently used).
   * If not cached, a new HTMLString is created, cached, and returned.
   *
   * @param content - The HTML string content
   * @returns HTMLString object (cached or newly created)
   */
  getOrCreate(content) {
    const cached = this.cache.get(content);
    if (cached) {
      this.cache.delete(content);
      this.cache.set(content, cached);
      return cached;
    }
    const htmlString = new HTMLString(content);
    this.cache.set(content, htmlString);
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== void 0) {
        this.cache.delete(firstKey);
      }
    }
    return htmlString;
  }
  /**
   * Get current cache size
   */
  size() {
    return this.cache.size;
  }
  /**
   * Pre-warms the cache with common HTML patterns.
   * This ensures first-render cache hits for frequently used tags.
   *
   * @param patterns - Array of HTML strings to pre-cache
   */
  warm(patterns) {
    for (const pattern of patterns) {
      if (!this.cache.has(pattern)) {
        this.cache.set(pattern, new HTMLString(pattern));
      }
    }
  }
  /**
   * Clear the entire cache
   */
  clear() {
    this.cache.clear();
  }
}
const COMMON_HTML_PATTERNS = [
  // Structural elements
  "<div>",
  "</div>",
  "<span>",
  "</span>",
  "<p>",
  "</p>",
  "<section>",
  "</section>",
  "<article>",
  "</article>",
  "<header>",
  "</header>",
  "<footer>",
  "</footer>",
  "<nav>",
  "</nav>",
  "<main>",
  "</main>",
  "<aside>",
  "</aside>",
  // List elements
  "<ul>",
  "</ul>",
  "<ol>",
  "</ol>",
  "<li>",
  "</li>",
  // Void/self-closing elements
  "<br>",
  "<hr>",
  "<br/>",
  "<hr/>",
  // Heading elements
  "<h1>",
  "</h1>",
  "<h2>",
  "</h2>",
  "<h3>",
  "</h3>",
  "<h4>",
  "</h4>",
  // Inline elements
  "<a>",
  "</a>",
  "<strong>",
  "</strong>",
  "<em>",
  "</em>",
  "<code>",
  "</code>",
  // Common whitespace
  " ",
  "\n"
];

const FORBIDDEN_PATH_KEYS = /* @__PURE__ */ new Set(["__proto__", "constructor", "prototype"]);

const dateTimeFormat = new Intl.DateTimeFormat([], {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false
});
const levels = {
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  silent: 90
};
function log(opts, level, label, message, newLine = true) {
  const logLevel = opts.level;
  const dest = opts.destination;
  const event = {
    label,
    level,
    message,
    newLine
  };
  if (!isLogLevelEnabled(logLevel, level)) {
    return;
  }
  dest.write(event);
}
function isLogLevelEnabled(configuredLogLevel, level) {
  return levels[configuredLogLevel] <= levels[level];
}
function info(opts, label, message, newLine = true) {
  return log(opts, "info", label, message, newLine);
}
function warn(opts, label, message, newLine = true) {
  return log(opts, "warn", label, message, newLine);
}
function error(opts, label, message, newLine = true) {
  return log(opts, "error", label, message, newLine);
}
function debug(...args) {
  if ("_astroGlobalDebug" in globalThis) {
    globalThis._astroGlobalDebug(...args);
  }
}
function getEventPrefix({ level, label }) {
  const timestamp = `${dateTimeFormat.format(/* @__PURE__ */ new Date())}`;
  const prefix = [];
  if (level === "error" || level === "warn") {
    prefix.push(colors.bold(timestamp));
    prefix.push(`[${level.toUpperCase()}]`);
  } else {
    prefix.push(timestamp);
  }
  if (label) {
    prefix.push(`[${label}]`);
  }
  if (level === "error") {
    return colors.red(prefix.join(" "));
  }
  if (level === "warn") {
    return colors.yellow(prefix.join(" "));
  }
  if (prefix.length === 1) {
    return colors.dim(prefix[0]);
  }
  return colors.dim(prefix[0]) + " " + colors.blue(prefix.splice(1).join(" "));
}
class AstroLogger {
  options;
  constructor(options) {
    this.options = options;
  }
  info(label, message, newLine = true) {
    info(this.options, label, message, newLine);
  }
  warn(label, message, newLine = true) {
    warn(this.options, label, message, newLine);
  }
  error(label, message, newLine = true) {
    error(this.options, label, message, newLine);
  }
  debug(label, ...messages) {
    debug(label, ...messages);
  }
  level() {
    return this.options.level;
  }
  forkIntegrationLogger(label) {
    return new AstroIntegrationLogger(this.options, label);
  }
  setDestination(destination) {
    this.options.destination = destination;
  }
  /**
   * It calls the `close` function of the provided destination, if it exists.
   */
  close() {
    if (this.options.destination.close) {
      this.options.destination.close();
    }
  }
  /**
   * It calls the `flush` function of the provided destinatin, if it exists.
   */
  flush() {
    if (this.options.destination.flush) {
      this.options.destination.flush();
    }
  }
}
class AstroIntegrationLogger {
  options;
  label;
  constructor(logging, label) {
    this.options = logging;
    this.label = label;
  }
  /**
   * Creates a new logger instance with a new label, but the same log options.
   */
  fork(label) {
    return new AstroIntegrationLogger(this.options, label);
  }
  info(message) {
    info(this.options, this.label, message);
  }
  warn(message) {
    warn(this.options, this.label, message);
  }
  error(message) {
    error(this.options, this.label, message);
  }
  debug(message) {
    debug(this.label, message);
  }
  /**
   * It calls the `flush` function of the provided destination, if it exists.
   */
  flush() {
    if (this.options.destination.flush) {
      this.options.destination.flush();
    }
  }
  /**
   * It calls the `close` function of the provided destination, if it exists.
   */
  close() {
    if (this.options.destination.close) {
      this.options.destination.close();
    }
  }
}

function matchesLevel(messageLevel, configuredLevel) {
  return levels[messageLevel] >= levels[configuredLevel];
}

function nodeLogDestination(config = {}) {
  const { level = "info" } = config;
  return {
    write(event) {
      let dest = process.stderr;
      if (levels[event.level] < levels["error"]) {
        dest = process.stdout;
      }
      if (!matchesLevel(event.level, level)) {
        return;
      }
      let trailingLine = event.newLine ? "\n" : "";
      if (event.label === "SKIP_FORMAT") {
        dest.write(event.message + trailingLine);
      } else {
        dest.write(getEventPrefix(event) + " " + event.message + trailingLine);
      }
    }
  };
}
function node_default(options) {
  return nodeLogDestination(options);
}

function consoleLogDestination(config = {}) {
  const { level = "info" } = config;
  return {
    write(event) {
      let dest = console.error;
      if (levels[event.level] < levels["error"]) {
        dest = console.info;
      }
      if (!matchesLevel(event.level, level)) {
        return;
      }
      if (event.label === "SKIP_FORMAT") {
        dest(event.message);
      } else {
        dest(getEventPrefix(event) + " " + event.message);
      }
    }
  };
}
function createConsoleLogger({ level }) {
  return new AstroLogger({
    level,
    destination: consoleLogDestination()
  });
}
function console_default(options) {
  return consoleLogDestination(options);
}

const SGR_REGEX = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g");
function jsonLoggerDestination(config = {}) {
  const { pretty = false, level = "info" } = config;
  return {
    write(event) {
      let dest = process.stderr;
      if (levels[event.level] < levels["error"]) {
        dest = process.stdout;
      }
      if (!matchesLevel(event.level, level)) {
        return;
      }
      let trailingLine = event.newLine ? "\n" : "";
      const message = event.message.replace(SGR_REGEX, "");
      if (pretty) {
        dest.write(
          JSON.stringify({ message, label: event.label, level: event.level }, null, 2) + trailingLine
        );
      } else {
        dest.write(
          JSON.stringify({ message, label: event.label, level: event.level }) + trailingLine
        );
      }
    }
  };
}

function compose(destinations) {
  return {
    write(chunk) {
      for (const logger of destinations) {
        logger.write(chunk);
      }
    },
    flush() {
      for (const logger of destinations) {
        if (logger.flush) {
          logger.flush();
        }
      }
    },
    close() {
      for (const logger of destinations) {
        if (logger.close) {
          logger.close();
        }
      }
    }
  };
}

async function loadLogger(config, level = "info") {
  let cause = void 0;
  try {
    switch (config.entrypoint) {
      case "astro/logger/node": {
        return new AstroLogger({
          destination: node_default(config.config),
          level
        });
      }
      case "astro/logger/console": {
        return new AstroLogger({
          destination: console_default(config.config),
          level
        });
      }
      case "astro/logger/json": {
        return new AstroLogger({
          destination: jsonLoggerDestination(config.config),
          level
        });
      }
      case "astro/logger/compose": {
        let destinations = [];
        if (config.config?.loggers) {
          const loggers = config.config?.loggers;
          destinations = await Promise.all(
            loggers.map(async (loggerConfig) => {
              const logger = await import(
                /* @vite-ignore */
                loggerConfig.entrypoint
              );
              return logger.default(loggerConfig.config);
            })
          );
        }
        return new AstroLogger({
          destination: compose(destinations),
          level
        });
      }
      default: {
        const nodeLogger = await import(
          /* @vite-ignore */
          config.entrypoint
        );
        return new AstroLogger({
          destination: nodeLogger.default(config.config),
          level
        });
      }
    }
  } catch (e) {
    if (e instanceof Error) {
      cause = e;
    }
  }
  const error = new AstroError({
    ...UnableToLoadLogger,
    message: UnableToLoadLogger.message(config.entrypoint)
  });
  if (cause) {
    error.cause = cause;
  }
  throw error;
}

const PipelineFeatures = {
  redirects: 1 << 0,
  sessions: 1 << 1,
  actions: 1 << 2,
  middleware: 1 << 3,
  i18n: 1 << 4,
  cache: 1 << 5
};
class Pipeline {
  internalMiddleware;
  resolvedMiddleware = void 0;
  resolvedLogger = false;
  resolvedActions = void 0;
  resolvedSessionDriver = void 0;
  resolvedCacheProvider = void 0;
  compiledCacheRoutes = void 0;
  nodePool;
  htmlStringCache;
  /**
   * Bit mask of pipeline features activated by handler classes.
   * Each handler sets its bit via `|=`. Only meaningful when a
   * custom `src/app.ts` fetch handler is in use.
   */
  usedFeatures = 0;
  logger;
  manifest;
  /**
   * "development" or "production" only
   */
  runtimeMode;
  renderers;
  resolve;
  streaming;
  /**
   * Used to provide better error messages for `Astro.clientAddress`
   */
  adapterName;
  clientDirectives;
  inlinedScripts;
  compressHTML;
  i18n;
  middleware;
  routeCache;
  /**
   * Used for `Astro.site`.
   */
  site;
  /**
   * Array of built-in, internal, routes.
   * Used to find the route module
   */
  defaultRoutes;
  actions;
  sessionDriver;
  cacheProvider;
  cacheConfig;
  serverIslands;
  /** Route data derived from the manifest, used for route matching. */
  manifestData;
  /** Pattern-matching router built from manifestData. */
  #router;
  constructor(logger, manifest, runtimeMode, renderers, resolve, streaming, adapterName = manifest.adapterName, clientDirectives = manifest.clientDirectives, inlinedScripts = manifest.inlinedScripts, compressHTML = manifest.compressHTML, i18n = manifest.i18n, middleware = manifest.middleware, routeCache = new RouteCache(logger, runtimeMode), site = manifest.site ? new URL(manifest.site) : void 0, defaultRoutes = createDefaultRoutes(manifest), actions = manifest.actions, sessionDriver = manifest.sessionDriver, cacheProvider = manifest.cacheProvider, cacheConfig = manifest.cacheConfig, serverIslands = manifest.serverIslandMappings) {
    this.logger = logger;
    this.manifest = manifest;
    this.runtimeMode = runtimeMode;
    this.renderers = renderers;
    this.resolve = resolve;
    this.streaming = streaming;
    this.adapterName = adapterName;
    this.clientDirectives = clientDirectives;
    this.inlinedScripts = inlinedScripts;
    this.compressHTML = compressHTML;
    this.i18n = i18n;
    this.middleware = middleware;
    this.routeCache = routeCache;
    this.site = site;
    this.defaultRoutes = defaultRoutes;
    this.actions = actions;
    this.sessionDriver = sessionDriver;
    this.cacheProvider = cacheProvider;
    this.cacheConfig = cacheConfig;
    this.serverIslands = serverIslands;
    this.manifestData = { routes: (manifest.routes ?? []).map((route) => route.routeData) };
    ensure404Route(this.manifestData);
    this.#router = new Router(this.manifestData.routes, {
      base: manifest.base,
      trailingSlash: manifest.trailingSlash,
      buildFormat: manifest.buildFormat
    });
    this.internalMiddleware = [];
    if (manifest.experimentalQueuedRendering.enabled) {
      this.nodePool = this.createNodePool(
        manifest.experimentalQueuedRendering.poolSize ?? 1e3,
        false
      );
      if (manifest.experimentalQueuedRendering.contentCache) {
        this.htmlStringCache = this.createStringCache();
      }
    }
  }
  /**
   * Low-level route matching against the manifest routes. Returns the
   * matched `RouteData` or `undefined`. Does not filter prerendered
   * routes or check public assets — use `BaseApp.match()` for that.
   */
  matchRoute(pathname) {
    const match = this.#router.match(pathname, { allowWithoutBase: true });
    if (match.type !== "match") return void 0;
    return match.route;
  }
  /**
   * Rebuilds the internal router after routes have been added or
   * removed (e.g. by the dev server on HMR).
   */
  rebuildRouter() {
    this.#router = new Router(this.manifestData.routes, {
      base: this.manifest.base,
      trailingSlash: this.manifest.trailingSlash,
      buildFormat: this.manifest.buildFormat
    });
  }
  /**
   * Resolves the middleware from the manifest, and returns the `onRequest` function. If `onRequest` isn't there,
   * it returns a no-op function
   */
  async getMiddleware() {
    if (this.resolvedMiddleware) {
      return this.resolvedMiddleware;
    }
    if (this.middleware) {
      const middlewareInstance = await this.middleware();
      const onRequest = middlewareInstance.onRequest ?? NOOP_MIDDLEWARE_FN;
      const internalMiddlewares = [onRequest];
      if (this.manifest.checkOrigin) {
        internalMiddlewares.unshift(createOriginCheckMiddleware());
      }
      this.resolvedMiddleware = sequence(...internalMiddlewares);
      return this.resolvedMiddleware;
    } else {
      this.resolvedMiddleware = NOOP_MIDDLEWARE_FN;
      return this.resolvedMiddleware;
    }
  }
  /**
   * Clears the cached middleware so it is re-resolved on the next request.
   * Called via HMR when middleware files change during development.
   */
  clearMiddleware() {
    this.resolvedMiddleware = void 0;
  }
  /**
   * Resolves the logger destination from the manifest and updates the pipeline logger.
   * If the user configured `experimental.logger`, the bundled logger factory is loaded
   * and replaces the default console destination. This is lazy and only resolves once.
   */
  async getLogger() {
    if (this.resolvedLogger) {
      return this.logger;
    }
    this.resolvedLogger = true;
    if (this.manifest.experimentalLogger) {
      this.logger = await loadLogger(this.manifest.experimentalLogger);
    }
    return this.logger;
  }
  async getActions() {
    if (this.resolvedActions) {
      return this.resolvedActions;
    } else if (this.actions) {
      return this.actions();
    }
    return NOOP_ACTIONS_MOD;
  }
  async getSessionDriver() {
    if (this.resolvedSessionDriver !== void 0) {
      return this.resolvedSessionDriver;
    }
    if (this.sessionDriver) {
      const driverModule = await this.sessionDriver();
      this.resolvedSessionDriver = driverModule?.default || null;
      return this.resolvedSessionDriver;
    }
    this.resolvedSessionDriver = null;
    return null;
  }
  async getCacheProvider() {
    if (this.resolvedCacheProvider !== void 0) {
      return this.resolvedCacheProvider;
    }
    if (this.cacheProvider) {
      const mod = await this.cacheProvider();
      const factory = mod?.default || null;
      this.resolvedCacheProvider = factory ? factory(this.cacheConfig?.options) : null;
      return this.resolvedCacheProvider;
    }
    this.resolvedCacheProvider = null;
    return null;
  }
  async getServerIslands() {
    if (this.serverIslands) {
      return this.serverIslands();
    }
    return {
      serverIslandMap: /* @__PURE__ */ new Map(),
      serverIslandNameMap: /* @__PURE__ */ new Map()
    };
  }
  async getAction(path) {
    const pathKeys = path.split(".").map((key) => decodeURIComponent(key));
    let { server } = await this.getActions();
    if (!server || !(typeof server === "object")) {
      throw new TypeError(
        `Expected \`server\` export in actions file to be an object. Received ${typeof server}.`
      );
    }
    for (const key of pathKeys) {
      if (FORBIDDEN_PATH_KEYS.has(key)) {
        throw new AstroError({
          ...ActionNotFoundError,
          message: ActionNotFoundError.message(pathKeys.join("."))
        });
      }
      if (!Object.hasOwn(server, key)) {
        throw new AstroError({
          ...ActionNotFoundError,
          message: ActionNotFoundError.message(pathKeys.join("."))
        });
      }
      server = server[key];
    }
    if (typeof server !== "function") {
      throw new TypeError(
        `Expected handler for action ${pathKeys.join(".")} to be a function. Received ${typeof server}.`
      );
    }
    return server;
  }
  async getModuleForRoute(route) {
    for (const defaultRoute of this.defaultRoutes) {
      if (route.component === defaultRoute.component) {
        return {
          page: () => Promise.resolve(defaultRoute.instance)
        };
      }
    }
    if (route.type === "redirect") {
      return RedirectSinglePageBuiltModule;
    } else {
      if (this.manifest.pageMap) {
        const importComponentInstance = this.manifest.pageMap.get(route.component);
        if (!importComponentInstance) {
          throw new Error(
            `Unexpectedly unable to find a component instance for route ${route.route}`
          );
        }
        return await importComponentInstance();
      } else if (this.manifest.pageModule) {
        return this.manifest.pageModule;
      }
      throw new Error(
        "Astro couldn't find the correct page to render, probably because it wasn't correctly mapped for SSR usage. This is an internal error, please file an issue."
      );
    }
  }
  createNodePool(poolSize, stats) {
    return new NodePool(poolSize, stats);
  }
  createStringCache() {
    return new HTMLStringCache(1e3);
  }
}

function getFunctionExpression(slot) {
  if (!slot) return;
  const expressions = slot?.expressions?.filter(
    (e) => isRenderInstruction(e) === false || isRenderTemplateResult(e)
  );
  if (expressions?.length !== 1) return;
  const expression = expressions[0];
  if (isRenderTemplateResult(expression)) {
    return getFunctionExpression(expression);
  }
  return expression;
}
class Slots {
  #result;
  #slots;
  #logger;
  constructor(result, slots, logger) {
    this.#result = result;
    this.#slots = slots;
    this.#logger = logger;
    if (slots) {
      for (const key of Object.keys(slots)) {
        if (this[key] !== void 0) {
          throw new AstroError({
            ...ReservedSlotName,
            message: ReservedSlotName.message(key)
          });
        }
        Object.defineProperty(this, key, {
          get() {
            return true;
          },
          enumerable: true
        });
      }
    }
  }
  has(name) {
    if (!this.#slots) return false;
    return Boolean(this.#slots[name]);
  }
  async render(name, args = []) {
    if (!this.#slots || !this.has(name)) return;
    const result = this.#result;
    if (!Array.isArray(args)) {
      this.#logger.warn(
        null,
        `Expected second parameter to be an array, received a ${typeof args}. If you're trying to pass an array as a single argument and getting unexpected results, make sure you're passing your array as an item of an array. Ex: Astro.slots.render('default', [["Hello", "World"]])`
      );
    } else if (args.length > 0) {
      const slotValue = this.#slots[name];
      const component = typeof slotValue === "function" ? await slotValue(result) : await slotValue;
      const expression = getFunctionExpression(component);
      if (expression) {
        const slot = async () => typeof expression === "function" ? expression(...args) : expression;
        return await renderSlotToString(result, slot).then((res) => {
          return res;
        });
      }
      if (typeof component === "function") {
        return await renderJSX(result, component(...args)).then(
          (res) => res != null ? String(res) : res
        );
      }
    }
    const content = await renderSlotToString(result, this.#slots[name]);
    const outHTML = chunkToString(result, content);
    return outHTML;
  }
}

function deduplicateDirectiveValues(existingDirective, newDirective) {
  const [directiveName, ...existingValues] = existingDirective.split(/\s+/).filter(Boolean);
  const [newDirectiveName, ...newValues] = newDirective.split(/\s+/).filter(Boolean);
  if (directiveName !== newDirectiveName) {
    return void 0;
  }
  const finalDirectives = Array.from(/* @__PURE__ */ new Set([...existingValues, ...newValues]));
  return `${directiveName} ${finalDirectives.join(" ")}`;
}
function pushDirective(directives, newDirective) {
  if (directives.length === 0) {
    return [newDirective];
  }
  const finalDirectives = [];
  let matched = false;
  for (const directive of directives) {
    if (matched) {
      finalDirectives.push(directive);
      continue;
    }
    const result = deduplicateDirectiveValues(directive, newDirective);
    if (result) {
      finalDirectives.push(result);
      matched = true;
    } else {
      finalDirectives.push(directive);
    }
  }
  if (!matched) {
    finalDirectives.push(newDirective);
  }
  return finalDirectives;
}

function computeFallbackRoute(options) {
  const {
    pathname,
    responseStatus,
    fallback,
    fallbackType,
    locales,
    defaultLocale,
    strategy,
    base
  } = options;
  if (responseStatus !== 404) {
    return { type: "none" };
  }
  if (!fallback || Object.keys(fallback).length === 0) {
    return { type: "none" };
  }
  const segments = pathname.split("/");
  const urlLocale = segments.find((segment) => {
    for (const locale of locales) {
      if (typeof locale === "string") {
        if (locale === segment) {
          return true;
        }
      } else if (locale.path === segment) {
        return true;
      }
    }
    return false;
  });
  if (!urlLocale) {
    return { type: "none" };
  }
  const fallbackKeys = Object.keys(fallback);
  if (!fallbackKeys.includes(urlLocale)) {
    return { type: "none" };
  }
  const fallbackLocale = fallback[urlLocale];
  const pathFallbackLocale = getPathByLocale(fallbackLocale, locales);
  let newPathname;
  if (pathFallbackLocale === defaultLocale && strategy === "pathname-prefix-other-locales") {
    if (pathname.includes(`${base}`)) {
      newPathname = pathname.replace(`/${urlLocale}`, ``);
    } else {
      newPathname = pathname.replace(`/${urlLocale}`, `/`);
    }
  } else {
    newPathname = pathname.replace(`/${urlLocale}`, `/${pathFallbackLocale}`);
  }
  return {
    type: fallbackType,
    pathname: newPathname
  };
}

class I18nRouter {
  #strategy;
  #defaultLocale;
  #locales;
  #base;
  #domains;
  constructor(options) {
    this.#strategy = options.strategy;
    this.#defaultLocale = options.defaultLocale;
    this.#locales = options.locales;
    this.#base = options.base === "/" ? "/" : removeTrailingForwardSlash(options.base || "");
    this.#domains = options.domains;
  }
  /**
   * Evaluate routing strategy for a pathname.
   * Returns decision object (not HTTP Response).
   */
  match(pathname, context) {
    if (this.shouldSkipProcessing(pathname, context)) {
      return { type: "continue" };
    }
    switch (this.#strategy) {
      case "manual":
        return { type: "continue" };
      case "pathname-prefix-always":
        return this.matchPrefixAlways(pathname, context);
      case "domains-prefix-always":
        if (this.localeHasntDomain(context.currentLocale, context.currentDomain)) {
          return { type: "continue" };
        }
        return this.matchPrefixAlways(pathname, context);
      case "pathname-prefix-other-locales":
        return this.matchPrefixOtherLocales(pathname, context);
      case "domains-prefix-other-locales":
        if (this.localeHasntDomain(context.currentLocale, context.currentDomain)) {
          return { type: "continue" };
        }
        return this.matchPrefixOtherLocales(pathname, context);
      case "pathname-prefix-always-no-redirect":
        return this.matchPrefixAlwaysNoRedirect(pathname, context);
      case "domains-prefix-always-no-redirect":
        if (this.localeHasntDomain(context.currentLocale, context.currentDomain)) {
          return { type: "continue" };
        }
        return this.matchPrefixAlwaysNoRedirect(pathname, context);
      default:
        return { type: "continue" };
    }
  }
  /**
   * Check if i18n processing should be skipped for this request
   */
  shouldSkipProcessing(pathname, context) {
    if (pathname.includes("/404") || pathname.includes("/500")) {
      return true;
    }
    if (pathname.includes("/_server-islands/")) {
      return true;
    }
    if (context.isReroute) {
      return true;
    }
    if (context.routeType && context.routeType !== "page" && context.routeType !== "fallback") {
      return true;
    }
    return false;
  }
  /**
   * Strategy: pathname-prefix-always
   * All locales must have a prefix, including the default locale.
   */
  matchPrefixAlways(pathname, _context) {
    const isRoot = pathname === this.#base + "/" || pathname === this.#base;
    if (isRoot) {
      const basePrefix = this.#base === "/" ? "" : this.#base;
      return {
        type: "redirect",
        location: `${basePrefix}/${this.#defaultLocale}`
      };
    }
    if (!pathHasLocale(pathname, this.#locales)) {
      return { type: "notFound" };
    }
    return { type: "continue" };
  }
  /**
   * Strategy: pathname-prefix-other-locales
   * Default locale has no prefix, other locales must have a prefix.
   */
  matchPrefixOtherLocales(pathname, _context) {
    let pathnameContainsDefaultLocale = false;
    for (const segment of pathname.split("/")) {
      if (normalizeTheLocale(segment) === normalizeTheLocale(this.#defaultLocale)) {
        pathnameContainsDefaultLocale = true;
        break;
      }
    }
    if (pathnameContainsDefaultLocale) {
      const newLocation = pathname.replace(`/${this.#defaultLocale}`, "");
      return {
        type: "notFound",
        location: newLocation
      };
    }
    return { type: "continue" };
  }
  /**
   * Strategy: pathname-prefix-always-no-redirect
   * Like prefix-always but allows root to serve instead of redirecting
   */
  matchPrefixAlwaysNoRedirect(pathname, _context) {
    const isRoot = pathname === this.#base + "/" || pathname === this.#base;
    if (isRoot) {
      return { type: "continue" };
    }
    if (!pathHasLocale(pathname, this.#locales)) {
      return { type: "notFound" };
    }
    return { type: "continue" };
  }
  /**
   * Check if the current locale doesn't belong to the configured domain.
   * Used for domain-based routing strategies.
   */
  localeHasntDomain(currentLocale, currentDomain) {
    if (!this.#domains || !currentDomain) {
      return false;
    }
    if (!currentLocale) {
      return false;
    }
    const localesForDomain = this.#domains[currentDomain];
    if (!localesForDomain) {
      return true;
    }
    return !localesForDomain.includes(currentLocale);
  }
}

class I18n {
  #i18n;
  #base;
  #trailingSlash;
  #format;
  #router;
  constructor(i18n, base, trailingSlash, format) {
    this.#i18n = i18n;
    this.#base = base;
    this.#trailingSlash = trailingSlash;
    this.#format = format;
    this.#router = new I18nRouter({
      strategy: i18n.strategy,
      defaultLocale: i18n.defaultLocale,
      locales: i18n.locales,
      base,
      domains: i18n.domainLookupTable ? Object.keys(i18n.domainLookupTable).reduce(
        (acc, domain) => {
          const locale = i18n.domainLookupTable[domain];
          if (!acc[domain]) {
            acc[domain] = [];
          }
          acc[domain].push(locale);
          return acc;
        },
        {}
      ) : void 0
    });
  }
  async finalize(state, response) {
    state.pipeline.usedFeatures |= PipelineFeatures.i18n;
    const i18n = this.#i18n;
    const typeHeader = response.headers.get(ROUTE_TYPE_HEADER);
    const isReroute = response.headers.get(REROUTE_DIRECTIVE_HEADER);
    if (isReroute === "no" && typeof i18n.fallback === "undefined") {
      return response;
    }
    if (typeHeader !== "page" && typeHeader !== "fallback") {
      return response;
    }
    const url = new URL(state.request.url);
    const currentLocale = state.computeCurrentLocale();
    const isPrerendered = state.routeData.prerender;
    const routerContext = {
      currentLocale,
      currentDomain: url.hostname,
      routeType: typeHeader,
      isReroute: isReroute === "yes"
    };
    const routeDecision = this.#router.match(url.pathname, routerContext);
    switch (routeDecision.type) {
      case "redirect": {
        let location = routeDecision.location;
        if (shouldAppendForwardSlash(this.#trailingSlash, this.#format)) {
          location = appendForwardSlash(location);
        }
        return new Response(null, {
          status: routeDecision.status ?? 302,
          headers: { Location: location }
        });
      }
      case "notFound": {
        if (isPrerendered) {
          const prerenderedRes = new Response(response.body, {
            status: 404,
            headers: response.headers
          });
          prerenderedRes.headers.set(REROUTE_DIRECTIVE_HEADER, "no");
          if (routeDecision.location) {
            prerenderedRes.headers.set("Location", routeDecision.location);
          }
          return prerenderedRes;
        }
        const headers = new Headers();
        if (routeDecision.location) {
          headers.set("Location", routeDecision.location);
        }
        return new Response(null, { status: 404, headers });
      }
    }
    if (i18n.fallback && i18n.fallbackType) {
      const effectiveStatus = typeHeader === "fallback" ? 404 : response.status;
      const fallbackDecision = computeFallbackRoute({
        pathname: url.pathname,
        responseStatus: effectiveStatus,
        fallback: i18n.fallback,
        fallbackType: i18n.fallbackType,
        locales: i18n.locales,
        defaultLocale: i18n.defaultLocale,
        strategy: i18n.strategy,
        base: this.#base
      });
      switch (fallbackDecision.type) {
        case "redirect":
          return new Response(null, {
            status: 302,
            headers: { Location: fallbackDecision.pathname + url.search }
          });
        case "rewrite":
          return await state.rewrite(fallbackDecision.pathname + url.search);
      }
    }
    return response;
  }
}

function pathHasLocale(path, locales) {
  const segments = path.split("/").map(normalizeThePath);
  for (const segment of segments) {
    for (const locale of locales) {
      if (typeof locale === "string") {
        if (normalizeTheLocale(segment) === normalizeTheLocale(locale)) {
          return true;
        }
      } else if (segment === locale.path) {
        return true;
      }
    }
  }
  return false;
}
function getPathByLocale(locale, locales) {
  for (const loopLocale of locales) {
    if (typeof loopLocale === "string") {
      if (loopLocale === locale) {
        return loopLocale;
      }
    } else {
      for (const code of loopLocale.codes) {
        if (code === locale) {
          return loopLocale.path;
        }
      }
    }
  }
  throw new AstroError(i18nNoLocaleFoundInPath);
}
function normalizeTheLocale(locale) {
  return locale.replaceAll("_", "-").toLowerCase();
}
function normalizeThePath(path) {
  return path.endsWith(".html") ? path.slice(0, -5) : path;
}
function getAllCodes(locales) {
  const result = [];
  for (const loopLocale of locales) {
    if (typeof loopLocale === "string") {
      result.push(loopLocale);
    } else {
      result.push(...loopLocale.codes);
    }
  }
  return result;
}

function parseLocale(header) {
  if (header === "*") {
    return [{ locale: header, qualityValue: void 0 }];
  }
  const result = [];
  const localeValues = header.split(",").map((str) => str.trim());
  for (const localeValue of localeValues) {
    const split = localeValue.split(";").map((str) => str.trim());
    const localeName = split[0];
    const qualityValue = split[1];
    if (!split) {
      continue;
    }
    if (qualityValue && qualityValue.startsWith("q=")) {
      const qualityValueAsFloat = Number.parseFloat(qualityValue.slice("q=".length));
      if (Number.isNaN(qualityValueAsFloat) || qualityValueAsFloat > 1) {
        result.push({
          locale: localeName,
          qualityValue: void 0
        });
      } else {
        result.push({
          locale: localeName,
          qualityValue: qualityValueAsFloat
        });
      }
    } else {
      result.push({
        locale: localeName,
        qualityValue: void 0
      });
    }
  }
  return result;
}
function sortAndFilterLocales(browserLocaleList, locales) {
  const normalizedLocales = getAllCodes(locales).map(normalizeTheLocale);
  return browserLocaleList.filter((browserLocale) => {
    if (browserLocale.locale !== "*") {
      return normalizedLocales.includes(normalizeTheLocale(browserLocale.locale));
    }
    return true;
  }).sort((a, b) => {
    if (a.qualityValue && b.qualityValue) {
      return Math.sign(b.qualityValue - a.qualityValue);
    }
    return 0;
  });
}
function computePreferredLocale(request, locales) {
  const acceptHeader = request.headers.get("Accept-Language");
  let result = void 0;
  if (acceptHeader) {
    const browserLocaleList = sortAndFilterLocales(parseLocale(acceptHeader), locales);
    const firstResult = browserLocaleList.at(0);
    if (firstResult && firstResult.locale !== "*") {
      outer: for (const currentLocale of locales) {
        if (typeof currentLocale === "string") {
          if (normalizeTheLocale(currentLocale) === normalizeTheLocale(firstResult.locale)) {
            result = currentLocale;
            break;
          }
        } else {
          for (const currentCode of currentLocale.codes) {
            if (normalizeTheLocale(currentCode) === normalizeTheLocale(firstResult.locale)) {
              result = currentCode;
              break outer;
            }
          }
        }
      }
    }
  }
  return result;
}
function computePreferredLocaleList(request, locales) {
  const acceptHeader = request.headers.get("Accept-Language");
  let result = [];
  if (acceptHeader) {
    const browserLocaleList = sortAndFilterLocales(parseLocale(acceptHeader), locales);
    if (browserLocaleList.length === 1 && browserLocaleList.at(0).locale === "*") {
      return getAllCodes(locales);
    } else if (browserLocaleList.length > 0) {
      for (const browserLocale of browserLocaleList) {
        for (const loopLocale of locales) {
          if (typeof loopLocale === "string") {
            if (normalizeTheLocale(loopLocale) === normalizeTheLocale(browserLocale.locale)) {
              result.push(loopLocale);
            }
          } else {
            for (const code of loopLocale.codes) {
              if (code === browserLocale.locale) {
                result.push(code);
              }
            }
          }
        }
      }
    }
  }
  return result;
}
function computeCurrentLocale(pathname, locales, defaultLocale) {
  for (const segment of pathname.split("/").map(normalizeThePath)) {
    for (const locale of locales) {
      if (typeof locale === "string") {
        if (!segment.includes(locale)) continue;
        if (normalizeTheLocale(locale) === normalizeTheLocale(segment)) {
          return locale;
        }
      } else {
        if (locale.path === segment) {
          return locale.codes.at(0);
        } else {
          for (const code of locale.codes) {
            if (normalizeTheLocale(code) === normalizeTheLocale(segment)) {
              return code;
            }
          }
        }
      }
    }
  }
  for (const locale of locales) {
    if (typeof locale === "string") {
      if (locale === defaultLocale) {
        return locale;
      }
    } else {
      if (locale.path === defaultLocale) {
        return locale.codes.at(0);
      }
    }
  }
}
function computeCurrentLocaleFromParams(params, locales) {
  const byNormalizedCode = /* @__PURE__ */ new Map();
  const byPath = /* @__PURE__ */ new Map();
  for (const locale of locales) {
    if (typeof locale === "string") {
      byNormalizedCode.set(normalizeTheLocale(locale), locale);
    } else {
      byPath.set(locale.path, locale.codes[0]);
      for (const code of locale.codes) {
        byNormalizedCode.set(normalizeTheLocale(code), code);
      }
    }
  }
  for (const value of Object.values(params)) {
    if (!value) continue;
    const pathMatch = byPath.get(value);
    if (pathMatch) return pathMatch;
    const codeMatch = byNormalizedCode.get(normalizeTheLocale(value));
    if (codeMatch) return codeMatch;
  }
}

async function callMiddleware(onRequest, apiContext, responseFunction) {
  let nextCalled = false;
  let responseFunctionPromise = void 0;
  const next = async (payload) => {
    nextCalled = true;
    responseFunctionPromise = responseFunction(apiContext, payload);
    return responseFunctionPromise;
  };
  const middlewarePromise = onRequest(apiContext, next);
  return await Promise.resolve(middlewarePromise).then(async (value) => {
    if (nextCalled) {
      if (typeof value !== "undefined") {
        if (value instanceof Response === false) {
          throw new AstroError(MiddlewareNotAResponse);
        }
        return value;
      } else {
        if (responseFunctionPromise) {
          return responseFunctionPromise;
        } else {
          throw new AstroError(MiddlewareNotAResponse);
        }
      }
    } else if (typeof value === "undefined") {
      throw new AstroError(MiddlewareNoDataOrNextCalled);
    } else if (value instanceof Response === false) {
      throw new AstroError(MiddlewareNotAResponse);
    } else {
      return value;
    }
  });
}

const EMPTY_OPTIONS = Object.freeze({ tags: [] });
class NoopAstroCache {
  enabled = false;
  set() {
  }
  get tags() {
    return [];
  }
  get options() {
    return EMPTY_OPTIONS;
  }
  async invalidate() {
  }
}
let hasWarned = false;
class DisabledAstroCache {
  enabled = false;
  #logger;
  constructor(logger) {
    this.#logger = logger;
  }
  #warn() {
    if (!hasWarned) {
      hasWarned = true;
      this.#logger?.warn(
        "cache",
        "`cache.set()` was called but caching is not enabled. Configure a cache provider in your Astro config under `experimental.cache` to enable caching."
      );
    }
  }
  set() {
    this.#warn();
  }
  get tags() {
    return [];
  }
  get options() {
    return EMPTY_OPTIONS;
  }
  async invalidate() {
    throw new AstroError(CacheNotEnabled);
  }
}

class AstroMiddleware {
  #pipeline;
  constructor(pipeline) {
    this.#pipeline = pipeline;
  }
  async handle(state, renderRouteCallback) {
    state.pipeline.usedFeatures |= PipelineFeatures.middleware;
    const pipeline = this.#pipeline;
    await state.getProps();
    const apiContext = state.getAPIContext();
    state.counter++;
    if (state.counter === 4) {
      return new Response("Loop Detected", {
        // https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/508
        status: 508,
        statusText: "Astro detected a loop where you tried to call the rewriting logic more than four times."
      });
    }
    const next = async (ctx, payload) => {
      if (payload) {
        pipeline.logger.debug("router", "Called rewriting to:", payload);
        const result = await pipeline.tryRewrite(payload, state.request);
        applyRewriteToState(state, payload, result);
      }
      return renderRouteCallback(state, ctx);
    };
    let response;
    if (state.skipMiddleware) {
      response = await next(apiContext);
    } else {
      const pipelineMiddleware = await pipeline.getMiddleware();
      const composed = sequence(...pipeline.internalMiddleware, pipelineMiddleware);
      response = await callMiddleware(composed, apiContext, next);
    }
    return this.#finalize(state, response);
  }
  #finalize(state, response) {
    if (response.headers.get(ROUTE_TYPE_HEADER)) {
      response.headers.delete(ROUTE_TYPE_HEADER);
    }
    attachCookiesToResponse(response, state.cookies);
    return response;
  }
}

const EMPTY_SLOTS = Object.freeze({});
class PagesHandler {
  #pipeline;
  constructor(pipeline) {
    this.#pipeline = pipeline;
  }
  async handle(state, ctx) {
    const pipeline = this.#pipeline;
    const { logger, streaming } = pipeline;
    let response;
    const componentInstance = await state.loadComponentInstance();
    switch (state.routeData.type) {
      case "endpoint": {
        response = await renderEndpoint(
          componentInstance,
          ctx,
          state.routeData.prerender,
          logger
        );
        break;
      }
      case "page": {
        const props = await state.getProps();
        const actionApiContext = state.getActionAPIContext();
        const result = await state.createResult(componentInstance, actionApiContext);
        try {
          response = await renderPage(
            result,
            componentInstance?.default,
            props,
            state.slots ?? EMPTY_SLOTS,
            streaming,
            state.routeData
          );
        } catch (e) {
          result.cancelled = true;
          throw e;
        }
        response.headers.set(ROUTE_TYPE_HEADER, "page");
        if (state.routeData.route === "/404" || state.routeData.route === "/500") {
          response.headers.set(REROUTE_DIRECTIVE_HEADER, "no");
        }
        if (state.isRewriting) {
          response.headers.set(REWRITE_DIRECTIVE_HEADER_KEY, REWRITE_DIRECTIVE_HEADER_VALUE);
        }
        break;
      }
      case "redirect": {
        return new Response(null, { status: 404, headers: { [ASTRO_ERROR_HEADER]: "true" } });
      }
      case "fallback": {
        return new Response(null, { status: 500, headers: { [ROUTE_TYPE_HEADER]: "fallback" } });
      }
    }
    const responseCookies = getCookiesFromResponse(response);
    if (responseCookies) {
      state.cookies.merge(responseCookies);
    }
    return response;
  }
}

function validateAndDecodePathname(pathname) {
  let decoded;
  try {
    decoded = decodeURI(pathname);
  } catch (_e) {
    throw new Error("Invalid URL encoding");
  }
  const hasDecoding = decoded !== pathname;
  const decodedStillHasEncoding = /%[0-9a-fA-F]{2}/.test(decoded);
  if (hasDecoding && decodedStillHasEncoding) {
    throw new Error("Multi-level URL encoding is not allowed");
  }
  return decoded;
}

function createNormalizedUrl(requestUrl) {
  return normalizeUrl(new URL(requestUrl));
}
function normalizeUrl(url) {
  try {
    url.pathname = validateAndDecodePathname(url.pathname);
  } catch {
    try {
      url.pathname = decodeURI(url.pathname);
    } catch {
    }
  }
  url.pathname = collapseDuplicateSlashes(url.pathname);
  return url;
}

function applyRewriteToState(state, payload, { routeData, componentInstance, newUrl, pathname }, { mergeCookies = false } = {}) {
  const pipeline = state.pipeline;
  const oldPathname = state.pathname;
  const isI18nFallback = routeData.fallbackRoutes && routeData.fallbackRoutes.length > 0;
  if (pipeline.manifest.serverLike && !state.routeData.prerender && routeData.prerender && !isI18nFallback) {
    throw new AstroError({
      ...ForbiddenRewrite,
      message: ForbiddenRewrite.message(state.pathname, pathname, routeData.component),
      hint: ForbiddenRewrite.hint(routeData.component)
    });
  }
  state.routeData = routeData;
  state.componentInstance = componentInstance;
  if (payload instanceof Request) {
    state.request = payload;
  } else {
    state.request = copyRequest(
      newUrl,
      state.request,
      routeData.prerender,
      pipeline.logger,
      state.routeData.route
    );
  }
  state.url = createNormalizedUrl(state.request.url);
  if (mergeCookies) {
    const newCookies = new AstroCookies(state.request);
    if (state.cookies) {
      newCookies.merge(state.cookies);
    }
    state.cookies = newCookies;
  }
  state.params = getParams(routeData, pathname);
  state.pathname = pathname;
  state.isRewriting = true;
  state.status = 200;
  setOriginPathname(
    state.request,
    oldPathname,
    pipeline.manifest.trailingSlash,
    pipeline.manifest.buildFormat
  );
  state.invalidateContexts();
}
class Rewrites {
  async execute(state, payload) {
    const pipeline = state.pipeline;
    pipeline.logger.debug("router", "Calling rewrite: ", payload);
    const result = await pipeline.tryRewrite(payload, state.request);
    applyRewriteToState(state, payload, result, { mergeCookies: true });
    const middleware = new AstroMiddleware(pipeline);
    const pagesHandler = new PagesHandler(pipeline);
    return middleware.handle(state, pagesHandler.handle.bind(pagesHandler));
  }
}

function matchRoute(pathname, manifest) {
  if (isRoute404(pathname)) {
    const errorRoute = manifest.routes.find((route) => isRoute404(route.route));
    if (errorRoute) return errorRoute;
  }
  if (isRoute500(pathname)) {
    const errorRoute = manifest.routes.find((route) => isRoute500(route.route));
    if (errorRoute) return errorRoute;
  }
  return manifest.routes.find((route) => {
    return route.pattern.test(pathname) || route.fallbackRoutes.some((fallbackRoute) => fallbackRoute.pattern.test(pathname));
  });
}
function isRoute404or500(route) {
  return isRoute404(route.route) || isRoute500(route.route);
}
function isRouteServerIsland(route) {
  return route.component === SERVER_ISLAND_COMPONENT;
}

const renderOptionsSymbol = /* @__PURE__ */ Symbol.for("astro.renderOptions");
function getRenderOptions(request) {
  return Reflect.get(request, renderOptionsSymbol);
}
function setRenderOptions(request, options) {
  Reflect.set(request, renderOptionsSymbol, options);
}

class FetchState {
  pipeline;
  /**
   * The request to render. Mutated during rewrites so subsequent renders
   * see the rewritten URL.
   */
  request;
  routeData;
  /**
   * The pathname to use for routing and rendering. Starts out as the raw,
   * base-stripped, decoded pathname from the request. May be further
   * normalized by `AstroHandler` after routeData is known (in dev, when
   * the matched route has no `.html` extension, `.html` / `/index.html`
   * suffixes are stripped).
   */
  pathname;
  /** Resolved render options (addCookieHeader, clientAddress, locals, etc.). */
  renderOptions;
  /** When the request started, used to log duration. */
  timeStart;
  /**
   * The route's loaded component module. Set before middleware runs; may
   * be swapped during in-flight rewrites from inside the middleware chain.
   */
  componentInstance;
  /**
   * Slot overrides supplied by the container API. `undefined` for HTTP
   * requests — `PagesHandler` coalesces to `{}` on read so we don't
   * allocate an empty object per request.
   */
  slots;
  /**
   * Default HTTP status for the rendered response. Callers override
   * before rendering runs (e.g. `AstroHandler` sets this from
   * `BaseApp.getDefaultStatusCode`; error handlers set `404` / `500`).
   */
  status = 200;
  /** Whether user middleware should be skipped for this request. */
  skipMiddleware = false;
  /** A flag that tells the render content if the rewriting was triggered. */
  isRewriting = false;
  /** A safety net in case of loops (rewrite counter). */
  counter = 0;
  /** Cookies for this request. Created lazily on first access. */
  cookies;
  /** Route params derived from routeData + pathname. Computed lazily. */
  #params;
  get params() {
    if (!this.#params && this.routeData) {
      this.#params = getParams(this.routeData, this.pathname);
    }
    return this.#params;
  }
  set params(value) {
    this.#params = value;
  }
  /** Normalized URL for this request. */
  url;
  /** Client address for this request. */
  clientAddress;
  /** Whether this is a partial render (container API). */
  partial;
  /** Whether to inject CSP meta tags. */
  shouldInjectCspMetaTags;
  /** Request-scoped locals object, shared with user middleware. */
  locals = {};
  /**
   * Memoized `props` (see `getProps`). `null` means "not yet computed"
   * — using `null` (rather than `undefined`) keeps the hidden class
   * stable and distinct from a valid-but-empty result.
   */
  props = null;
  /** Memoized `ActionAPIContext` (see `getActionAPIContext`). */
  actionApiContext = null;
  /** Memoized `APIContext` (see `getAPIContext`). */
  apiContext = null;
  /** Registered context providers keyed by name. Lazy-initialized on first provide(). */
  #providers;
  /** Cached values from resolved providers. Lazy-initialized on first resolve(). */
  #providersResolvedValues;
  /** Cached promise for lazy component instance loading. */
  #componentInstancePromise;
  /** SSR result for the current page render. */
  result;
  /** Initial props (from container/error handler). */
  initialProps = {};
  /** Rewrites handler instance. Lazy-initialized on first rewrite(). */
  #rewrites;
  /** Memoized Astro page partial. */
  #astroPagePartial;
  /** Memoized current locale. */
  #currentLocale;
  /** Memoized preferred locale. */
  #preferredLocale;
  /** Memoized preferred locale list. */
  #preferredLocaleList;
  constructor(pipeline, request, options) {
    this.pipeline = pipeline;
    this.request = request;
    options ??= getRenderOptions(request);
    this.routeData = options?.routeData;
    this.renderOptions = options ?? {
      addCookieHeader: false,
      clientAddress: void 0,
      locals: void 0,
      prerenderedErrorPageFetch: fetch,
      routeData: void 0,
      waitUntil: void 0
    };
    this.componentInstance = void 0;
    this.slots = void 0;
    const url = new URL(request.url);
    this.pathname = this.#computePathname(url);
    this.timeStart = performance.now();
    this.clientAddress = options?.clientAddress;
    this.locals = options?.locals ?? {};
    this.url = normalizeUrl(url);
    this.cookies = new AstroCookies(request);
    if (!Reflect.get(request, originPathnameSymbol)) {
      setOriginPathname(
        request,
        this.pathname,
        pipeline.manifest.trailingSlash,
        pipeline.manifest.buildFormat
      );
    }
    this.#resolveRouteData();
  }
  /**
   * Triggers a rewrite. Delegates to the Rewrites handler.
   */
  rewrite(payload) {
    return (this.#rewrites ??= new Rewrites()).execute(this, payload);
  }
  /**
   * Creates the SSR result for the current page render.
   */
  async createResult(mod, ctx) {
    const pipeline = this.pipeline;
    const { clientDirectives, inlinedScripts, compressHTML, manifest, renderers, resolve } = pipeline;
    const routeData = this.routeData;
    const { links, scripts, styles } = await pipeline.headElements(routeData);
    const extraStyleHashes = [];
    const extraScriptHashes = [];
    const shouldInjectCspMetaTags = this.shouldInjectCspMetaTags ?? manifest.shouldInjectCspMetaTags;
    const cspAlgorithm = manifest.csp?.algorithm ?? "SHA-256";
    if (shouldInjectCspMetaTags) {
      for (const style of styles) {
        extraStyleHashes.push(await generateCspDigest(style.children, cspAlgorithm));
      }
      for (const script of scripts) {
        extraScriptHashes.push(await generateCspDigest(script.children, cspAlgorithm));
      }
    }
    const componentMetadata = await pipeline.componentMetadata(routeData) ?? manifest.componentMetadata;
    const headers = new Headers({ "Content-Type": "text/html" });
    const partial = typeof this.partial === "boolean" ? this.partial : Boolean(mod.partial);
    const actionResult = hasActionPayload(this.locals) ? deserializeActionResult(this.locals._actionPayload.actionResult) : void 0;
    const status = this.status;
    const response = {
      status: actionResult?.error ? actionResult?.error.status : status,
      statusText: actionResult?.error ? actionResult?.error.type : "OK",
      get headers() {
        return headers;
      },
      set headers(_) {
        throw new AstroError(AstroResponseHeadersReassigned);
      }
    };
    const state = this;
    const result = {
      base: manifest.base,
      userAssetsBase: manifest.userAssetsBase,
      cancelled: false,
      clientDirectives,
      inlinedScripts,
      componentMetadata,
      compressHTML,
      cookies: this.cookies,
      createAstro: (props, slots) => state.createAstro(result, props, slots, ctx),
      links,
      // SAFETY: createResult is only called after route resolution, so routeData
      // is always set and the params getter always returns a value.
      params: this.params,
      partial,
      pathname: this.pathname,
      renderers,
      resolve,
      response,
      request: this.request,
      scripts,
      styles,
      actionResult,
      async getServerIslandNameMap() {
        const serverIslands = await pipeline.getServerIslands();
        return serverIslands.serverIslandNameMap ?? /* @__PURE__ */ new Map();
      },
      key: manifest.key,
      trailingSlash: manifest.trailingSlash,
      _experimentalQueuedRendering: {
        pool: pipeline.nodePool,
        htmlStringCache: pipeline.htmlStringCache,
        enabled: manifest.experimentalQueuedRendering?.enabled,
        poolSize: manifest.experimentalQueuedRendering?.poolSize,
        contentCache: manifest.experimentalQueuedRendering?.contentCache
      },
      _metadata: {
        hasHydrationScript: false,
        rendererSpecificHydrationScripts: /* @__PURE__ */ new Set(),
        hasRenderedHead: false,
        renderedScripts: /* @__PURE__ */ new Set(),
        hasDirectives: /* @__PURE__ */ new Set(),
        hasRenderedServerIslandRuntime: false,
        headInTree: false,
        extraHead: [],
        extraStyleHashes,
        extraScriptHashes,
        propagators: /* @__PURE__ */ new Set(),
        templateDepth: 0
      },
      cspDestination: manifest.csp?.cspDestination ?? (routeData.prerender ? "meta" : "header"),
      shouldInjectCspMetaTags,
      cspAlgorithm,
      scriptHashes: manifest.csp?.scriptHashes ? [...manifest.csp.scriptHashes] : [],
      scriptResources: manifest.csp?.scriptResources ? [...manifest.csp.scriptResources] : [],
      styleHashes: manifest.csp?.styleHashes ? [...manifest.csp.styleHashes] : [],
      styleResources: manifest.csp?.styleResources ? [...manifest.csp.styleResources] : [],
      directives: manifest.csp?.directives ? [...manifest.csp.directives] : [],
      isStrictDynamic: manifest.csp?.isStrictDynamic ?? false,
      internalFetchHeaders: manifest.internalFetchHeaders
    };
    this.result = result;
    return result;
  }
  /**
   * Creates the Astro global object for a component render.
   */
  createAstro(result, props, slotValues, apiContext) {
    let astroPagePartial;
    if (this.isRewriting) {
      this.#astroPagePartial = this.createAstroPagePartial(result, apiContext);
    }
    this.#astroPagePartial ??= this.createAstroPagePartial(result, apiContext);
    astroPagePartial = this.#astroPagePartial;
    const astroComponentPartial = { props, self: null };
    const Astro = Object.assign(
      Object.create(astroPagePartial),
      astroComponentPartial
    );
    let _slots;
    Object.defineProperty(Astro, "slots", {
      get: () => {
        if (!_slots) {
          _slots = new Slots(
            result,
            slotValues,
            this.pipeline.logger
          );
        }
        return _slots;
      }
    });
    return Astro;
  }
  /**
   * Creates the Astro page-level partial (prototype for Astro global).
   */
  createAstroPagePartial(result, apiContext) {
    const state = this;
    const { cookies, locals, params, pipeline, url } = this;
    const { response } = result;
    const redirect = (path, status = 302) => {
      if (state.request[responseSentSymbol$1]) {
        throw new AstroError({
          ...ResponseSentError
        });
      }
      return new Response(null, { status, headers: { Location: path } });
    };
    const rewrite = async (reroutePayload) => {
      return await state.rewrite(reroutePayload);
    };
    const callAction = createCallAction(apiContext);
    const partial = {
      generator: ASTRO_GENERATOR,
      routePattern: this.routeData.route,
      isPrerendered: this.routeData.prerender,
      cookies,
      get clientAddress() {
        return state.getClientAddress();
      },
      get currentLocale() {
        return state.computeCurrentLocale();
      },
      params,
      get preferredLocale() {
        return state.computePreferredLocale();
      },
      get preferredLocaleList() {
        return state.computePreferredLocaleList();
      },
      locals,
      redirect,
      rewrite,
      request: this.request,
      response,
      site: pipeline.site,
      getActionResult: createGetActionResult(locals),
      get callAction() {
        return callAction;
      },
      url,
      get originPathname() {
        return getOriginPathname(state.request);
      },
      get csp() {
        return state.getCsp();
      },
      get logger() {
        return {
          info(msg) {
            pipeline.logger.info(null, msg);
          },
          warn(msg) {
            pipeline.logger.warn(null, msg);
          },
          error(msg) {
            pipeline.logger.error(null, msg);
          }
        };
      }
    };
    this.defineProviderGetters(partial);
    return partial;
  }
  getClientAddress() {
    const { pipeline, clientAddress } = this;
    const routeData = this.routeData;
    if (routeData.prerender) {
      throw new AstroError({
        ...PrerenderClientAddressNotAvailable,
        message: PrerenderClientAddressNotAvailable.message(routeData.component)
      });
    }
    if (clientAddress) {
      return clientAddress;
    }
    if (pipeline.adapterName) {
      throw new AstroError({
        ...ClientAddressNotAvailable,
        message: ClientAddressNotAvailable.message(pipeline.adapterName)
      });
    }
    throw new AstroError(StaticClientAddressNotAvailable);
  }
  getCookies() {
    return this.cookies;
  }
  getCsp() {
    const state = this;
    const { pipeline } = this;
    if (!pipeline.manifest.csp) {
      if (pipeline.runtimeMode === "production") {
        pipeline.logger.warn(
          "csp",
          `context.csp was used when rendering the route ${colors.green(state.routeData.route)}, but CSP was not configured. For more information, see https://docs.astro.build/en/reference/configuration-reference/#securitycsp`
        );
      }
      return void 0;
    }
    return {
      insertDirective(payload) {
        if (state?.result?.directives) {
          state.result.directives = pushDirective(state.result.directives, payload);
        } else {
          state?.result?.directives.push(payload);
        }
      },
      insertScriptResource(resource) {
        state.result?.scriptResources.push(resource);
      },
      insertStyleResource(resource) {
        state.result?.styleResources.push(resource);
      },
      insertStyleHash(hash) {
        state.result?.styleHashes.push(hash);
      },
      insertScriptHash(hash) {
        state.result?.scriptHashes.push(hash);
      }
    };
  }
  computeCurrentLocale() {
    const {
      url,
      pipeline: { i18n },
      routeData
    } = this;
    if (!i18n || !routeData) return;
    const { defaultLocale, locales, strategy } = i18n;
    const fallbackTo = strategy === "pathname-prefix-other-locales" || strategy === "domains-prefix-other-locales" ? defaultLocale : void 0;
    if (this.#currentLocale) {
      return this.#currentLocale;
    }
    let computedLocale;
    if (isRouteServerIsland(routeData)) {
      let referer = this.request.headers.get("referer");
      if (referer) {
        if (URL.canParse(referer)) {
          referer = new URL(referer).pathname;
        }
        computedLocale = computeCurrentLocale(referer, locales, defaultLocale);
      }
    } else {
      let pathname = routeData.pathname;
      if (url && !routeData.pattern.test(url.pathname)) {
        for (const fallbackRoute of routeData.fallbackRoutes) {
          if (fallbackRoute.pattern.test(url.pathname)) {
            pathname = fallbackRoute.pathname;
            break;
          }
        }
      }
      pathname = pathname && !isRoute404or500(routeData) ? pathname : url.pathname ?? this.pathname;
      computedLocale = computeCurrentLocale(pathname, locales, defaultLocale);
      if (routeData.params.length > 0) {
        const localeFromParams = computeCurrentLocaleFromParams(this.params, locales);
        if (localeFromParams) {
          computedLocale = localeFromParams;
        }
      }
    }
    this.#currentLocale = computedLocale ?? fallbackTo;
    return this.#currentLocale;
  }
  computePreferredLocale() {
    const {
      pipeline: { i18n },
      request
    } = this;
    if (!i18n) return;
    return this.#preferredLocale ??= computePreferredLocale(request, i18n.locales);
  }
  computePreferredLocaleList() {
    const {
      pipeline: { i18n },
      request
    } = this;
    if (!i18n) return;
    return this.#preferredLocaleList ??= computePreferredLocaleList(request, i18n.locales);
  }
  /**
   * Lazily loads the route's component module. Returns the cached
   * instance if already loaded. The promise is cached so concurrent
   * callers share the same load.
   */
  async loadComponentInstance() {
    if (this.componentInstance) return this.componentInstance;
    if (this.#componentInstancePromise) return this.#componentInstancePromise;
    this.#componentInstancePromise = this.pipeline.getComponentByRoute(this.routeData).then((mod) => {
      this.componentInstance = mod;
      return mod;
    });
    return this.#componentInstancePromise;
  }
  /**
   * Registers a context provider under the given key. Handlers call
   * this to contribute values to the request context (e.g. sessions).
   * The `create` factory is called lazily on the first `resolve(key)`.
   */
  provide(key, provider) {
    (this.#providers ??= /* @__PURE__ */ new Map()).set(key, provider);
  }
  /**
   * Lazily resolves a provider registered under `key`. Calls
   * `provider.create()` on first access and caches the result.
   * Returns `undefined` if no provider was registered for the key.
   */
  resolve(key) {
    if (this.#providersResolvedValues?.has(key)) {
      return this.#providersResolvedValues.get(key);
    }
    const provider = this.#providers?.get(key);
    if (!provider) return void 0;
    const value = provider.create();
    (this.#providersResolvedValues ??= /* @__PURE__ */ new Map()).set(key, value);
    return value;
  }
  /**
   * Runs all registered `finalize` callbacks. Should be called after
   * the response is produced, typically in a `finally` block.
   *
   * Returns synchronously (no promise allocation) when nothing needs
   * finalizing — important for the hot path where sessions are not used.
   */
  finalizeAll() {
    if (!this.#providersResolvedValues || this.#providersResolvedValues.size === 0) return;
    let chain;
    for (const [key, provider] of this.#providers) {
      if (provider.finalize && this.#providersResolvedValues.has(key)) {
        const result = provider.finalize(this.#providersResolvedValues.get(key));
        if (result) {
          chain = chain ? chain.then(() => result) : result;
        }
      }
    }
    return chain;
  }
  /**
   * Adds lazy getters to `target` for each registered provider key.
   * Used by context creation (APIContext, Astro global) so that
   * provider values like `session` and `cache` appear as properties
   * without hard-coding the keys.
   */
  defineProviderGetters(target) {
    if (!this.#providers) return;
    const state = this;
    for (const key of this.#providers.keys()) {
      Object.defineProperty(target, key, {
        get: () => state.resolve(key),
        enumerable: true,
        configurable: true
      });
    }
  }
  /**
   * Resolves the route to use for this request and stores it on
   * `this.routeData`. If the adapter (or the dev server) provided a
   * `routeData` via render options it's already set and this is a
   * no-op. Otherwise we use the app's synchronous route matcher and
   * fall back to a `404.astro` route so middleware can still run.
   *
   * Called eagerly from the constructor so individual handlers
   * (actions, pages, middleware, etc.) always see a resolved route
   * without the caller needing an extra setup step.
   *
   * Once routeData is known, finalizes `this.pathname`: in dev, if the
   * matched route has no `.html` extension, strip `.html` / `/index.html`
   * suffixes so the rendering pipeline sees the canonical pathname.
   */
  /**
   * Strip `.html` / `/index.html` suffixes from the pathname so the
   * rendering pipeline sees the canonical route path. Skipped when the
   * matched route itself has an `.html` extension in its definition.
   */
  #stripHtmlExtension() {
    if (this.routeData && !routeHasHtmlExtension(this.routeData)) {
      this.pathname = this.pathname.replace(/\/index\.html$/, "/").replace(/\.html$/, "");
    }
  }
  #resolveRouteData() {
    const pipeline = this.pipeline;
    if (this.routeData) {
      this.#stripHtmlExtension();
      return;
    }
    const matched = pipeline.matchRoute(this.pathname);
    if (matched && matched.prerender && pipeline.manifest.serverLike) {
      this.routeData = void 0;
    } else {
      this.routeData = matched;
    }
    pipeline.logger.debug("router", "Astro matched the following route for " + this.request.url);
    pipeline.logger.debug("router", "RouteData:\n" + this.routeData);
    if (!this.routeData) {
      this.routeData = pipeline.manifestData.routes.find(
        (route) => route.component === "404.astro" || route.component === DEFAULT_404_COMPONENT
      );
    }
    if (!this.routeData) {
      pipeline.logger.debug("router", "Astro hasn't found routes that match " + this.request.url);
      pipeline.logger.debug("router", "Here's the available routes:\n", pipeline.manifestData);
      return;
    }
    this.#stripHtmlExtension();
  }
  /**
   * Strips the pipeline's base from the request URL, prepends a forward
   * slash, and decodes the pathname. Falls back to the raw (not decoded)
   * pathname if `decodeURI` throws.
   *
   * Mirrors `BaseApp.removeBase`, including the
   * `collapseDuplicateLeadingSlashes` fix that prevents middleware
   * authorization bypass when the URL starts with `//`.
   */
  #computePathname(url) {
    let pathname = collapseDuplicateLeadingSlashes(url.pathname);
    const base = this.pipeline.manifest.base;
    if (pathname.startsWith(base)) {
      const baseWithoutTrailingSlash = removeTrailingForwardSlash(base);
      pathname = pathname.slice(baseWithoutTrailingSlash.length + 1);
    }
    pathname = prependForwardSlash(pathname);
    try {
      return decodeURI(pathname);
    } catch (e) {
      this.pipeline.logger.error(null, e.toString());
      return pathname;
    }
  }
  /**
   * Returns the resolved `props` for this render, computing them lazily
   * from the route + component module on first access. If the
   * `initialProps` already carries user-supplied props (e.g. the
   * container API) those are used verbatim.
   */
  async getProps() {
    if (this.props !== null) return this.props;
    if (Object.keys(this.initialProps).length > 0) {
      this.props = this.initialProps;
      return this.props;
    }
    const pipeline = this.pipeline;
    const mod = await this.loadComponentInstance();
    this.props = await getProps({
      mod,
      routeData: this.routeData,
      routeCache: pipeline.routeCache,
      pathname: this.pathname,
      logger: pipeline.logger,
      serverLike: pipeline.manifest.serverLike,
      base: pipeline.manifest.base,
      trailingSlash: pipeline.manifest.trailingSlash
    });
    return this.props;
  }
  /**
   * Returns the `ActionAPIContext` for this render, creating it lazily.
   * Used by middleware, actions, and page dispatch.
   */
  getActionAPIContext() {
    if (this.actionApiContext !== null) return this.actionApiContext;
    const state = this;
    const ctx = {
      get cookies() {
        return state.cookies;
      },
      routePattern: this.routeData.route,
      isPrerendered: this.routeData.prerender,
      get clientAddress() {
        return state.getClientAddress();
      },
      get currentLocale() {
        return state.computeCurrentLocale();
      },
      generator: ASTRO_GENERATOR,
      get locals() {
        return state.locals;
      },
      set locals(_) {
        throw new AstroError(LocalsReassigned);
      },
      // SAFETY: getActionAPIContext is only called after route resolution,
      // so routeData is always set and the params getter always returns a value.
      params: this.params,
      get preferredLocale() {
        return state.computePreferredLocale();
      },
      get preferredLocaleList() {
        return state.computePreferredLocaleList();
      },
      request: this.request,
      site: this.pipeline.site,
      url: this.url,
      get originPathname() {
        return getOriginPathname(state.request);
      },
      get csp() {
        return state.getCsp();
      },
      get logger() {
        if (!state.pipeline.manifest.experimentalLogger) {
          state.pipeline.logger.warn(
            null,
            "The Astro.logger is available only when experimental.logger is defined."
          );
          return void 0;
        }
        return {
          info(msg) {
            state.pipeline.logger.info(null, msg);
          },
          warn(msg) {
            state.pipeline.logger.warn(null, msg);
          },
          error(msg) {
            state.pipeline.logger.error(null, msg);
          }
        };
      }
    };
    this.defineProviderGetters(ctx);
    this.actionApiContext = ctx;
    return this.actionApiContext;
  }
  /**
   * Returns the `APIContext` for this render, creating it lazily from
   * the memoized props + action context.
   *
   * Callers must ensure `getProps()` has resolved at least once before
   * calling this.
   */
  getAPIContext() {
    if (this.apiContext !== null) return this.apiContext;
    const actionApiContext = this.getActionAPIContext();
    const state = this;
    const redirect = (path, status = 302) => new Response(null, { status, headers: { Location: path } });
    const rewrite = async (reroutePayload) => {
      return await state.rewrite(reroutePayload);
    };
    Reflect.set(actionApiContext, pipelineSymbol, this.pipeline);
    actionApiContext[fetchStateSymbol] = this;
    this.apiContext = Object.assign(actionApiContext, {
      props: this.props,
      redirect,
      rewrite,
      getActionResult: createGetActionResult(actionApiContext.locals),
      callAction: createCallAction(actionApiContext)
    });
    return this.apiContext;
  }
  /**
   * Invalidates the cached `APIContext` so the next `getAPIContext()`
   * call re-derives it from the (possibly mutated) state. Used
   * after an in-flight rewrite swaps the route / request / params.
   */
  invalidateContexts() {
    this.props = null;
    this.actionApiContext = null;
    this.apiContext = null;
  }
}

class ActionHandler {
  /**
   * Run action handling for the current request. Expects the APIContext
   * that is already being used by the render pipeline.
   *
   * Returns a `Response` when the action fully handles the request (RPC),
   * or `undefined` when the caller should continue processing the
   * request (form actions or non-action requests).
   */
  handle(apiContext, state) {
    state.pipeline.usedFeatures |= PipelineFeatures.actions;
    if (apiContext.isPrerendered) {
      return void 0;
    }
    const { action, setActionResult } = getActionContext(apiContext);
    if (!action) {
      return void 0;
    }
    return this.#executeAction(action, setActionResult);
  }
  async #executeAction(action, setActionResult) {
    const actionResult = await action.handler();
    const serialized = serializeActionResult(actionResult);
    if (action.calledFrom === "rpc") {
      if (serialized.type === "empty") {
        return new Response(null, {
          status: serialized.status
        });
      }
      return new Response(serialized.body, {
        status: serialized.status,
        headers: {
          "Content-Type": serialized.contentType
        }
      });
    }
    setActionResult(action.name, serialized);
    return void 0;
  }
}

function prepareResponse(response, { addCookieHeader }) {
  for (const headerName of INTERNAL_RESPONSE_HEADERS) {
    if (response.headers.has(headerName)) {
      response.headers.delete(headerName);
    }
  }
  if (addCookieHeader) {
    for (const setCookieHeaderValue of getSetCookiesFromResponse(response)) {
      response.headers.append("set-cookie", setCookieHeaderValue);
    }
  }
  Reflect.set(response, responseSentSymbol$1, true);
}

function redirectTemplate({
  status,
  absoluteLocation,
  relativeLocation,
  from
}) {
  const delay = status === 302 ? 2 : 0;
  const rel = escape(String(relativeLocation));
  const abs = escape(String(absoluteLocation));
  const fromHtml = from ? `from <code>${escape(from)}</code> ` : "";
  return `<!doctype html>
<title>Redirecting to: ${rel}</title>
<meta http-equiv="refresh" content="${delay};url=${rel}">
<meta name="robots" content="noindex">
<link rel="canonical" href="${abs}">
<body>
	<a href="${rel}">Redirecting ${fromHtml}to <code>${rel}</code></a>
</body>`;
}

class TrailingSlashHandler {
  #app;
  constructor(app) {
    this.#app = app;
  }
  /**
   * Returns a redirect `Response` if the request pathname needs
   * normalization, or `undefined` if no redirect is required.
   */
  handle(state) {
    const url = new URL(state.request.url);
    const redirect = this.#redirectTrailingSlash(url.pathname);
    if (redirect === url.pathname) {
      return void 0;
    }
    const addCookieHeader = state.renderOptions.addCookieHeader;
    const status = state.request.method === "GET" ? 301 : 308;
    const response = new Response(
      redirectTemplate({
        status,
        relativeLocation: url.pathname,
        absoluteLocation: redirect,
        from: state.request.url
      }),
      {
        status,
        headers: {
          location: redirect + url.search
        }
      }
    );
    prepareResponse(response, { addCookieHeader });
    return response;
  }
  #redirectTrailingSlash(pathname) {
    const { trailingSlash } = this.#app.manifest;
    if (pathname === "/" || isInternalPath(pathname)) {
      return pathname;
    }
    const path = collapseDuplicateTrailingSlashes(pathname, trailingSlash !== "never");
    if (path !== pathname) {
      return path;
    }
    if (trailingSlash === "ignore") {
      return pathname;
    }
    if (trailingSlash === "always" && !hasFileExtension(pathname)) {
      return appendForwardSlash(pathname);
    }
    if (trailingSlash === "never") {
      return removeTrailingForwardSlash(pathname);
    }
    return pathname;
  }
}

function defaultSetHeaders(options) {
  const headers = new Headers();
  const directives = [];
  if (options.maxAge !== void 0) {
    directives.push(`max-age=${options.maxAge}`);
  }
  if (options.swr !== void 0) {
    directives.push(`stale-while-revalidate=${options.swr}`);
  }
  if (directives.length > 0) {
    headers.set("CDN-Cache-Control", directives.join(", "));
  }
  if (options.tags && options.tags.length > 0) {
    headers.set("Cache-Tag", options.tags.join(", "));
  }
  if (options.lastModified) {
    headers.set("Last-Modified", options.lastModified.toUTCString());
  }
  if (options.etag) {
    headers.set("ETag", options.etag);
  }
  return headers;
}
function isLiveDataEntry(value) {
  return value != null && typeof value === "object" && "id" in value && "data" in value && "cacheHint" in value;
}

const APPLY_HEADERS = /* @__PURE__ */ Symbol.for("astro:cache:apply");
const IS_ACTIVE = /* @__PURE__ */ Symbol.for("astro:cache:active");
class AstroCache {
  #options = {};
  #tags = /* @__PURE__ */ new Set();
  #disabled = false;
  #provider;
  enabled = true;
  constructor(provider) {
    this.#provider = provider;
  }
  set(input) {
    if (input === false) {
      this.#disabled = true;
      this.#tags.clear();
      this.#options = {};
      return;
    }
    this.#disabled = false;
    let options;
    if (isLiveDataEntry(input)) {
      if (!input.cacheHint) return;
      options = input.cacheHint;
    } else {
      options = input;
    }
    if ("maxAge" in options && options.maxAge !== void 0) this.#options.maxAge = options.maxAge;
    if ("swr" in options && options.swr !== void 0)
      this.#options.swr = options.swr;
    if ("etag" in options && options.etag !== void 0)
      this.#options.etag = options.etag;
    if (options.lastModified !== void 0) {
      if (!this.#options.lastModified || options.lastModified > this.#options.lastModified) {
        this.#options.lastModified = options.lastModified;
      }
    }
    if (options.tags) {
      for (const tag of options.tags) this.#tags.add(tag);
    }
  }
  get tags() {
    return [...this.#tags];
  }
  /**
   * Get the current cache options (read-only snapshot).
   * Includes all accumulated options: maxAge, swr, tags, etag, lastModified.
   */
  get options() {
    return {
      ...this.#options,
      tags: this.tags
    };
  }
  async invalidate(input) {
    if (!this.#provider) {
      throw new AstroError(CacheNotEnabled);
    }
    let options;
    if (isLiveDataEntry(input)) {
      options = { tags: input.cacheHint?.tags ?? [] };
    } else {
      options = input;
    }
    return this.#provider.invalidate(options);
  }
  /** @internal */
  [APPLY_HEADERS](response) {
    if (this.#disabled) return;
    const finalOptions = { ...this.#options, tags: this.tags };
    if (finalOptions.maxAge === void 0 && !finalOptions.tags?.length) return;
    const headers = this.#provider?.setHeaders?.(finalOptions) ?? defaultSetHeaders(finalOptions);
    for (const [key, value] of headers) {
      response.headers.set(key, value);
    }
  }
  /** @internal */
  get [IS_ACTIVE]() {
    return !this.#disabled && (this.#options.maxAge !== void 0 || this.#tags.size > 0);
  }
}
function applyCacheHeaders(cache, response) {
  if (APPLY_HEADERS in cache) {
    cache[APPLY_HEADERS](response);
  }
}

const ROUTE_DYNAMIC_SPLIT = /\[(.+?\(.+?\)|.+?)\]/;
const ROUTE_SPREAD = /^\.{3}.+$/;
function getParts(part, file) {
  const result = [];
  part.split(ROUTE_DYNAMIC_SPLIT).map((str, i) => {
    if (!str) return;
    const dynamic = i % 2 === 1;
    const [, content] = dynamic ? /([^(]+)$/.exec(str) || [null, null] : [null, str];
    if (!content || dynamic && !/^(?:\.\.\.)?[\w$]+$/.test(content)) {
      throw new Error(`Invalid route ${file} \u2014 parameter name must match /^[a-zA-Z0-9_$]+$/`);
    }
    result.push({
      content,
      dynamic,
      spread: dynamic && ROUTE_SPREAD.test(content)
    });
  });
  return result;
}

function compileCacheRoutes(routes, base, trailingSlash) {
  const compiled = Object.entries(routes).map(([path, options]) => {
    const segments = removeLeadingForwardSlash(path).split("/").filter(Boolean).map((s) => getParts(s, path));
    const pattern = getPattern(segments, base, trailingSlash);
    return { pattern, options, segments, route: path };
  });
  compiled.sort(
    (a, b) => routeComparator(
      { segments: a.segments, route: a.route, type: "page" },
      { segments: b.segments, route: b.route, type: "page" }
    )
  );
  return compiled;
}
function matchCacheRoute(pathname, compiledRoutes) {
  for (const route of compiledRoutes) {
    if (route.pattern.test(pathname)) return route.options;
  }
  return null;
}

const CACHE_KEY = "cache";
function provideCache(state) {
  const pipeline = state.pipeline;
  if (!pipeline.cacheConfig) {
    state.provide(CACHE_KEY, {
      create: () => new DisabledAstroCache(pipeline.logger)
    });
    return;
  }
  if (pipeline.runtimeMode === "development") {
    state.provide(CACHE_KEY, {
      create: () => new NoopAstroCache()
    });
    return;
  }
  return provideCacheAsync(state, pipeline);
}
async function provideCacheAsync(state, pipeline) {
  const cacheProvider = await pipeline.getCacheProvider();
  state.provide(CACHE_KEY, {
    create() {
      const cache = new AstroCache(cacheProvider);
      if (pipeline.cacheConfig?.routes) {
        if (!pipeline.compiledCacheRoutes) {
          pipeline.compiledCacheRoutes = compileCacheRoutes(
            pipeline.cacheConfig.routes,
            pipeline.manifest.base,
            pipeline.manifest.trailingSlash
          );
        }
        const matched = matchCacheRoute(state.pathname, pipeline.compiledCacheRoutes);
        if (matched) {
          cache.set(matched);
        }
      }
      return cache;
    }
  });
}
class CacheHandler {
  #app;
  constructor(app) {
    this.#app = app;
  }
  async handle(state, next) {
    this.#app.pipeline.usedFeatures |= PipelineFeatures.cache;
    if (!this.#app.pipeline.cacheProvider) {
      return next();
    }
    const cache = state.resolve(CACHE_KEY);
    const cacheProvider = await this.#app.pipeline.getCacheProvider();
    if (cacheProvider?.onRequest) {
      const response2 = await cacheProvider.onRequest(
        {
          request: state.request,
          url: new URL(state.request.url),
          waitUntil: state.renderOptions.waitUntil
        },
        async () => {
          const res = await next();
          applyCacheHeaders(cache, res);
          return res;
        }
      );
      response2.headers.delete("CDN-Cache-Control");
      response2.headers.delete("Cache-Tag");
      return response2;
    }
    const response = await next();
    applyCacheHeaders(cache, response);
    return response;
  }
}

function isExternalURL(url) {
  return url.startsWith("http://") || url.startsWith("https://") || url.startsWith("//");
}
function redirectIsExternal(redirect) {
  if (typeof redirect === "string") {
    return isExternalURL(redirect);
  } else {
    return isExternalURL(redirect.destination);
  }
}
function computeRedirectStatus(method, redirect, redirectRoute) {
  return redirectRoute && typeof redirect === "object" ? redirect.status : method === "GET" ? 301 : 308;
}
function resolveRedirectTarget(params, redirect, redirectRoute, trailingSlash) {
  if (typeof redirectRoute !== "undefined") {
    const generate = getRouteGenerator(redirectRoute.segments, trailingSlash);
    return generate(params);
  } else if (typeof redirect === "string") {
    if (redirectIsExternal(redirect)) {
      return redirect;
    } else {
      let target = redirect;
      for (const param of Object.keys(params)) {
        const paramValue = params[param];
        target = target.replace(`[${param}]`, paramValue).replace(`[...${param}]`, paramValue);
      }
      return target;
    }
  } else if (typeof redirect === "undefined") {
    return "/";
  }
  return redirect.destination;
}
async function renderRedirect(state) {
  state.pipeline.usedFeatures |= PipelineFeatures.redirects;
  const routeData = state.routeData;
  const { redirect, redirectRoute } = routeData;
  const status = computeRedirectStatus(state.request.method, redirect, redirectRoute);
  const headers = {
    location: encodeURI(
      resolveRedirectTarget(
        state.params,
        redirect,
        redirectRoute,
        state.pipeline.manifest.trailingSlash
      )
    )
  };
  if (redirect && redirectIsExternal(redirect)) {
    if (typeof redirect === "string") {
      return Response.redirect(redirect, status);
    } else {
      return Response.redirect(redirect.destination, status);
    }
  }
  return new Response(null, { status, headers });
}

const PERSIST_SYMBOL = /* @__PURE__ */ Symbol();
const DEFAULT_COOKIE_NAME = "astro-session";
const VALID_COOKIE_REGEX = /^[\w-]+$/;
const unflatten = (parsed, _) => {
  return unflatten$1(parsed, {
    URL: (href) => new URL(href)
  });
};
const stringify = (data, _) => {
  return stringify$1(data, {
    // Support URL objects
    URL: (val) => val instanceof URL && val.href
  });
};
class AstroSession {
  // The cookies object.
  #cookies;
  // The session configuration.
  #config;
  // The cookie config
  #cookieConfig;
  // The cookie name
  #cookieName;
  // The unstorage object for the session driver.
  #storage;
  #data;
  // The session ID. A v4 UUID.
  #sessionID;
  // Sessions to destroy. Needed because we won't have the old session ID after it's destroyed locally.
  #toDestroy = /* @__PURE__ */ new Set();
  // Session keys to delete. Used for partial data sets to avoid overwriting the deleted value.
  #toDelete = /* @__PURE__ */ new Set();
  // Whether the session is dirty and needs to be saved.
  #dirty = false;
  // Whether the session cookie has been set.
  #cookieSet = false;
  // Whether the session ID was sourced from a client cookie rather than freshly generated.
  #sessionIDFromCookie = false;
  // The local data is "partial" if it has not been loaded from storage yet and only
  // contains values that have been set or deleted in-memory locally.
  // We do this to avoid the need to block on loading data when it is only being set.
  // When we load the data from storage, we need to merge it with the local partial data,
  // preserving in-memory changes and deletions.
  #partial = true;
  // The driver factory function provided by the pipeline
  #driverFactory;
  static #sharedStorage = /* @__PURE__ */ new Map();
  constructor({
    cookies,
    config,
    runtimeMode,
    driverFactory,
    mockStorage
  }) {
    if (!config) {
      throw new AstroError({
        ...SessionStorageInitError,
        message: SessionStorageInitError.message(
          "No driver was defined in the session configuration and the adapter did not provide a default driver."
        )
      });
    }
    this.#cookies = cookies;
    this.#driverFactory = driverFactory;
    const { cookie: cookieConfig = DEFAULT_COOKIE_NAME, ...configRest } = config;
    let cookieConfigObject;
    if (typeof cookieConfig === "object") {
      const { name = DEFAULT_COOKIE_NAME, ...rest } = cookieConfig;
      this.#cookieName = name;
      cookieConfigObject = rest;
    } else {
      this.#cookieName = cookieConfig || DEFAULT_COOKIE_NAME;
    }
    this.#cookieConfig = {
      sameSite: "lax",
      secure: runtimeMode === "production",
      path: "/",
      ...cookieConfigObject,
      httpOnly: true
    };
    this.#config = configRest;
    if (mockStorage) {
      this.#storage = mockStorage;
    }
  }
  /**
   * Gets a session value. Returns `undefined` if the session or value does not exist.
   */
  async get(key) {
    return (await this.#ensureData()).get(key)?.data;
  }
  /**
   * Checks if a session value exists.
   */
  async has(key) {
    return (await this.#ensureData()).has(key);
  }
  /**
   * Gets all session values.
   */
  async keys() {
    return (await this.#ensureData()).keys();
  }
  /**
   * Gets all session values.
   */
  async values() {
    return [...(await this.#ensureData()).values()].map((entry) => entry.data);
  }
  /**
   * Gets all session entries.
   */
  async entries() {
    return [...(await this.#ensureData()).entries()].map(([key, entry]) => [key, entry.data]);
  }
  /**
   * Deletes a session value.
   */
  delete(key) {
    this.#data ??= /* @__PURE__ */ new Map();
    this.#data.delete(key);
    if (this.#partial) {
      this.#toDelete.add(key);
    }
    this.#dirty = true;
  }
  /**
   * Sets a session value. The session is created if it does not exist.
   */
  set(key, value, { ttl } = {}) {
    if (!key) {
      throw new AstroError({
        ...SessionStorageSaveError,
        message: "The session key was not provided."
      });
    }
    let cloned;
    try {
      cloned = unflatten(JSON.parse(stringify(value)));
    } catch (err) {
      throw new AstroError(
        {
          ...SessionStorageSaveError,
          message: `The session data for ${key} could not be serialized.`,
          hint: "See the devalue library for all supported types: https://github.com/rich-harris/devalue"
        },
        { cause: err }
      );
    }
    if (!this.#cookieSet) {
      this.#setCookie();
      this.#cookieSet = true;
    }
    this.#data ??= /* @__PURE__ */ new Map();
    const lifetime = ttl ?? this.#config.ttl;
    const expires = typeof lifetime === "number" ? Date.now() + lifetime * 1e3 : lifetime;
    this.#data.set(key, {
      data: cloned,
      expires
    });
    this.#dirty = true;
  }
  /**
   * Destroys the session, clearing the cookie and storage if it exists.
   */
  destroy() {
    const sessionId = this.#sessionID ?? this.#cookies.get(this.#cookieName)?.value;
    if (sessionId) {
      this.#toDestroy.add(sessionId);
    }
    this.#cookies.delete(this.#cookieName, this.#cookieConfig);
    this.#sessionID = void 0;
    this.#data = void 0;
    this.#dirty = true;
  }
  /**
   * Regenerates the session, creating a new session ID. The existing session data is preserved.
   */
  async regenerate() {
    let data = /* @__PURE__ */ new Map();
    try {
      data = await this.#ensureData();
    } catch (err) {
      console.error("Failed to load session data during regeneration:", err);
    }
    const oldSessionId = this.#sessionID;
    this.#sessionID = crypto.randomUUID();
    this.#sessionIDFromCookie = false;
    this.#data = data;
    this.#dirty = true;
    await this.#setCookie();
    if (oldSessionId && this.#storage) {
      this.#storage.removeItem(oldSessionId).catch((err) => {
        console.error("Failed to remove old session data:", err);
      });
    }
  }
  // Persists the session data to storage.
  // This is called automatically at the end of the request.
  // Uses a symbol to prevent users from calling it directly.
  async [PERSIST_SYMBOL]() {
    if (!this.#dirty && !this.#toDestroy.size) {
      return;
    }
    const storage = await this.#ensureStorage();
    if (this.#dirty && this.#data) {
      const data = await this.#ensureData();
      this.#toDelete.forEach((key2) => data.delete(key2));
      const key = this.#ensureSessionID();
      let serialized;
      try {
        serialized = stringify(data);
      } catch (err) {
        throw new AstroError(
          {
            ...SessionStorageSaveError,
            message: SessionStorageSaveError.message(
              "The session data could not be serialized.",
              this.#config.driver
            )
          },
          { cause: err }
        );
      }
      await storage.setItem(key, serialized);
      this.#dirty = false;
    }
    if (this.#toDestroy.size > 0) {
      const cleanupPromises = [...this.#toDestroy].map(
        (sessionId) => storage.removeItem(sessionId).catch((err) => {
          console.error("Failed to clean up session %s:", sessionId, err);
        })
      );
      await Promise.all(cleanupPromises);
      this.#toDestroy.clear();
    }
  }
  get sessionID() {
    return this.#sessionID;
  }
  /**
   * Loads a session from storage with the given ID, and replaces the current session.
   * Any changes made to the current session will be lost.
   * This is not normally needed, as the session is automatically loaded using the cookie.
   * However it can be used to restore a session where the ID has been recorded somewhere
   * else (e.g. in a database).
   */
  async load(sessionID) {
    this.#sessionID = sessionID;
    this.#data = void 0;
    await this.#setCookie();
    await this.#ensureData();
  }
  /**
   * Sets the session cookie.
   */
  async #setCookie() {
    if (!VALID_COOKIE_REGEX.test(this.#cookieName)) {
      throw new AstroError({
        ...SessionStorageSaveError,
        message: "Invalid cookie name. Cookie names can only contain letters, numbers, and dashes."
      });
    }
    const value = this.#ensureSessionID();
    this.#cookies.set(this.#cookieName, value, this.#cookieConfig);
  }
  /**
   * Attempts to load the session data from storage, or creates a new data object if none exists.
   * If there is existing partial data, it will be merged into the new data object.
   */
  async #ensureData() {
    if (this.#data && !this.#partial) {
      return this.#data;
    }
    this.#data ??= /* @__PURE__ */ new Map();
    if (!this.#sessionID && !this.#cookies.get(this.#cookieName)?.value) {
      this.#partial = false;
      return this.#data;
    }
    const storage = await this.#ensureStorage();
    const raw = await storage.get(this.#ensureSessionID());
    if (!raw) {
      if (this.#sessionIDFromCookie) {
        this.#sessionID = crypto.randomUUID();
        this.#sessionIDFromCookie = false;
        if (this.#cookieSet) {
          await this.#setCookie();
        }
      }
      return this.#data;
    }
    try {
      const storedMap = unflatten(raw);
      if (!(storedMap instanceof Map)) {
        await this.destroy();
        throw new AstroError({
          ...SessionStorageInitError,
          message: SessionStorageInitError.message(
            "The session data was an invalid type.",
            this.#config.driver
          )
        });
      }
      const now = Date.now();
      for (const [key, value] of storedMap) {
        const expired = typeof value.expires === "number" && value.expires < now;
        if (!this.#data.has(key) && !this.#toDelete.has(key) && !expired) {
          this.#data.set(key, value);
        }
      }
      this.#partial = false;
      return this.#data;
    } catch (err) {
      await this.destroy();
      if (err instanceof AstroError) {
        throw err;
      }
      throw new AstroError(
        {
          ...SessionStorageInitError,
          message: SessionStorageInitError.message(
            "The session data could not be parsed.",
            this.#config.driver
          )
        },
        { cause: err }
      );
    }
  }
  /**
   * Returns the session ID, generating a new one if it does not exist.
   */
  #ensureSessionID() {
    if (!this.#sessionID) {
      const cookieValue = this.#cookies.get(this.#cookieName)?.value;
      if (cookieValue) {
        this.#sessionID = cookieValue;
        this.#sessionIDFromCookie = true;
      } else {
        this.#sessionID = crypto.randomUUID();
      }
    }
    return this.#sessionID;
  }
  /**
   * Ensures the storage is initialized.
   * This is called automatically when a storage operation is needed.
   */
  async #ensureStorage() {
    if (this.#storage) {
      return this.#storage;
    }
    if (AstroSession.#sharedStorage.has(this.#config.driver)) {
      this.#storage = AstroSession.#sharedStorage.get(this.#config.driver);
      return this.#storage;
    }
    if (!this.#driverFactory) {
      throw new AstroError({
        ...SessionStorageInitError,
        message: SessionStorageInitError.message(
          "Astro could not load the driver correctly. Does it exist?",
          this.#config.driver
        )
      });
    }
    const driver = this.#driverFactory;
    try {
      this.#storage = createStorage({
        driver: {
          ...driver(this.#config.options),
          // Unused methods
          hasItem() {
            return false;
          },
          getKeys() {
            return [];
          }
        }
      });
      AstroSession.#sharedStorage.set(this.#config.driver, this.#storage);
      return this.#storage;
    } catch (err) {
      throw new AstroError(
        {
          ...SessionStorageInitError,
          message: SessionStorageInitError.message("Unknown error", this.#config.driver)
        },
        { cause: err }
      );
    }
  }
}

const SESSION_KEY = "session";
function provideSession(state) {
  state.pipeline.usedFeatures |= PipelineFeatures.sessions;
  const pipeline = state.pipeline;
  const config = pipeline.manifest.sessionConfig;
  if (!config) return;
  return provideSessionAsync(state, config);
}
async function provideSessionAsync(state, config) {
  const pipeline = state.pipeline;
  const driverFactory = await pipeline.getSessionDriver();
  if (!driverFactory) return;
  state.provide(SESSION_KEY, {
    create() {
      const cookies = state.cookies;
      return new AstroSession({
        cookies,
        config,
        runtimeMode: pipeline.runtimeMode,
        driverFactory,
        mockStorage: null
      });
    },
    finalize(session) {
      return session[PERSIST_SYMBOL]();
    }
  });
}

class AstroHandler {
  #app;
  #trailingSlashHandler;
  #actionHandler;
  #astroMiddleware;
  #pagesHandler;
  #cacheHandler;
  /** Bound callback for the middleware chain — created once, reused per request. */
  #renderRouteCallback;
  /**
   * i18n post-processor. Only set when the app has i18n configured and
   * the strategy is not `manual` — for the manual strategy users wire
   * `astro:i18n.middleware(...)` into their own `onRequest`.
   */
  #i18n;
  /** Whether sessions are configured on the manifest. */
  #hasSession;
  constructor(app) {
    this.#app = app;
    this.#trailingSlashHandler = new TrailingSlashHandler(app);
    this.#actionHandler = new ActionHandler();
    this.#astroMiddleware = new AstroMiddleware(app.pipeline);
    this.#pagesHandler = new PagesHandler(app.pipeline);
    this.#cacheHandler = new CacheHandler(app);
    this.#renderRouteCallback = this.#actionsAndPages.bind(this);
    this.#hasSession = !!app.manifest.sessionConfig;
    const i18n = app.manifest.i18n;
    if (i18n && i18n.strategy !== "manual") {
      this.#i18n = new I18n(
        i18n,
        app.manifest.base,
        app.manifest.trailingSlash,
        app.manifest.buildFormat
      );
    }
  }
  /**
   * Runs actions then pages — the callback at the bottom of the
   * middleware chain. Bound once in the constructor to avoid
   * per-request closure allocation.
   */
  #actionsAndPages(state, ctx) {
    if (!state.skipMiddleware) {
      const actionResult = this.#actionHandler.handle(ctx, state);
      if (actionResult) {
        return actionResult.then((response) => response ?? this.#pagesHandler.handle(state, ctx));
      }
    }
    return this.#pagesHandler.handle(state, ctx);
  }
  async handle(state) {
    const trailingSlashRedirect = this.#trailingSlashHandler.handle(state);
    if (trailingSlashRedirect) {
      return trailingSlashRedirect;
    }
    if (!state.routeData) {
      return this.#app.renderError(state.request, {
        ...state.renderOptions,
        status: 404,
        pathname: state.pathname
      });
    }
    return this.render(state);
  }
  /**
   * Renders a response for the given `FetchState`. Assumes
   * trailing-slash redirects and routeData resolution have already run.
   *
   * User-triggered rewrites (`Astro.rewrite` / `ctx.rewrite`) go through
   * `Rewrites.execute` on the current `FetchState` — they mutate the
   * existing state in place and re-run middleware + page dispatch.
   */
  async render(state) {
    const routeData = state.routeData;
    const pathname = state.pathname;
    const request = state.request;
    const { addCookieHeader } = state.renderOptions;
    const defaultStatus = this.#app.getDefaultStatusCode(routeData, pathname);
    state.status = defaultStatus;
    let response;
    try {
      if (this.#hasSession || this.#app.pipeline.cacheConfig) {
        const sessionP = this.#hasSession ? provideSession(state) : void 0;
        const cacheP = this.#app.pipeline.cacheConfig ? provideCache(state) : void 0;
        if (sessionP || cacheP) await Promise.all([sessionP, cacheP]);
      }
      state.pipeline.usedFeatures |= PipelineFeatures.sessions;
      if (routeData.type === "redirect") {
        const redirectResponse = await renderRedirect(state);
        this.#app.logThisRequest({
          pathname,
          method: request.method,
          statusCode: redirectResponse.status,
          isRewrite: false,
          timeStart: state.timeStart
        });
        prepareResponse(redirectResponse, { addCookieHeader });
        this.#app.pipeline.logger.flush();
        return redirectResponse;
      }
      if (!this.#app.pipeline.cacheProvider) {
        this.#app.pipeline.usedFeatures |= PipelineFeatures.cache;
        response = await this.#astroMiddleware.handle(state, this.#renderRouteCallback);
        if (this.#i18n) {
          response = await this.#i18n.finalize(state, response);
        }
      } else {
        const runPipeline = async () => {
          let res = await this.#astroMiddleware.handle(state, this.#renderRouteCallback);
          if (this.#i18n) {
            res = await this.#i18n.finalize(state, res);
          }
          return res;
        };
        response = await this.#cacheHandler.handle(state, runPipeline);
      }
      const isRewrite = response.headers.has(REWRITE_DIRECTIVE_HEADER_KEY);
      this.#app.logThisRequest({
        pathname,
        method: request.method,
        statusCode: response.status,
        isRewrite,
        timeStart: state.timeStart
      });
    } catch (err) {
      this.#app.logger.error(null, err.stack || err.message || String(err));
      return this.#app.renderError(request, {
        ...state.renderOptions,
        status: 500,
        error: err,
        pathname: state.pathname
      });
    } finally {
      const finalize = state.finalizeAll();
      if (finalize) await finalize;
    }
    if (REROUTABLE_STATUS_CODES.includes(response.status) && // If the body isn't null, that means the user sets the 404 status
    // but uses the current route to handle the 404
    response.body === null && response.headers.get(REROUTE_DIRECTIVE_HEADER) !== "no") {
      return this.#app.renderError(request, {
        ...state.renderOptions,
        response,
        status: response.status,
        // We don't have an error to report here. Passing null means we pass nothing intentionally
        // while undefined means there's no error
        error: response.status === 500 ? null : void 0,
        pathname: state.pathname
      });
    }
    prepareResponse(response, { addCookieHeader });
    this.#app.pipeline.logger.flush();
    return response;
  }
}

class DefaultFetchHandler {
  #app;
  #handler;
  constructor(app) {
    this.#app = app ?? null;
    this.#handler = app ? new AstroHandler(app) : null;
  }
  /**
   * Fast path: called directly by `BaseApp.render()` with pre-resolved
   * options, avoiding the `Reflect.set/get` round-trip through the request.
   */
  renderWithOptions(request, options) {
    if (!this.#app) {
      const app = Reflect.get(request, appSymbol);
      if (!app) {
        throw new Error("No fetch handler provided.");
      }
      this.#app = app;
      this.#handler = new AstroHandler(app);
    }
    const state = new FetchState(this.#app.pipeline, request, options);
    return this.#handler.handle(state);
  }
  fetch = (request) => {
    if (!this.#app) {
      const app = Reflect.get(request, appSymbol);
      if (!app) {
        throw new Error("No fetch handler provided.");
      }
      this.#app = app;
      this.#handler = new AstroHandler(app);
    }
    const state = new FetchState(this.#app.pipeline, request);
    if (!this.#handler) {
      throw new Error("No fetch handler provided.");
    }
    return this.#handler.handle(state);
  };
}

const fetchable = new DefaultFetchHandler();

class DefaultErrorHandler {
  #app;
  #astroMiddleware;
  #pagesHandler;
  constructor(app) {
    this.#app = app;
    this.#astroMiddleware = new AstroMiddleware(app.pipeline);
    this.#pagesHandler = new PagesHandler(app.pipeline);
  }
  async renderError(request, {
    status,
    response: originalResponse,
    skipMiddleware = false,
    error,
    pathname,
    ...resolvedRenderOptions
  }) {
    const app = this.#app;
    const resolvedPathname = pathname ?? new FetchState(app.pipeline, request).pathname;
    const errorRoutePath = `/${status}${app.manifest.trailingSlash === "always" ? "/" : ""}`;
    const errorRouteData = matchRoute(errorRoutePath, app.manifestData);
    const url = new URL(request.url);
    if (errorRouteData) {
      if (errorRouteData.prerender) {
        const maybeDotHtml = errorRouteData.route.endsWith(`/${status}`) ? ".html" : "";
        const statusURL = new URL(`${app.baseWithoutTrailingSlash}/${status}${maybeDotHtml}`, url);
        if (statusURL.toString() !== request.url && resolvedRenderOptions.prerenderedErrorPageFetch) {
          const response2 = await resolvedRenderOptions.prerenderedErrorPageFetch(
            statusURL.toString()
          );
          const override = { status, removeContentEncodingHeaders: true };
          const newResponse = mergeResponses(response2, originalResponse, override);
          prepareResponse(newResponse, resolvedRenderOptions);
          return newResponse;
        }
      }
      const mod = await app.pipeline.getComponentByRoute(errorRouteData);
      const errorState = new FetchState(app.pipeline, request);
      errorState.skipMiddleware = skipMiddleware;
      errorState.clientAddress = resolvedRenderOptions.clientAddress;
      errorState.routeData = errorRouteData;
      errorState.pathname = resolvedPathname;
      errorState.status = status;
      errorState.componentInstance = mod;
      errorState.locals = resolvedRenderOptions.locals ?? {};
      errorState.initialProps = { error };
      try {
        await provideSession(errorState);
        const response2 = await this.#astroMiddleware.handle(
          errorState,
          this.#pagesHandler.handle.bind(this.#pagesHandler)
        );
        const newResponse = mergeResponses(response2, originalResponse);
        prepareResponse(newResponse, resolvedRenderOptions);
        return newResponse;
      } catch {
        if (skipMiddleware === false) {
          return this.renderError(request, {
            ...resolvedRenderOptions,
            status,
            response: originalResponse,
            skipMiddleware: true,
            pathname: resolvedPathname
          });
        }
      } finally {
        await errorState.finalizeAll();
      }
    }
    const response = mergeResponses(new Response(null, { status }), originalResponse);
    prepareResponse(response, resolvedRenderOptions);
    return response;
  }
}
function mergeResponses(newResponse, originalResponse, override) {
  let newResponseHeaders = newResponse.headers;
  if (override?.removeContentEncodingHeaders) {
    newResponseHeaders = new Headers(newResponseHeaders);
    newResponseHeaders.delete("Content-Encoding");
    newResponseHeaders.delete("Content-Length");
  }
  if (!originalResponse) {
    if (override !== void 0) {
      return new Response(newResponse.body, {
        status: override.status,
        statusText: newResponse.statusText,
        headers: newResponseHeaders
      });
    }
    return newResponse;
  }
  const status = override?.status ? override.status : originalResponse.status === 200 ? newResponse.status : originalResponse.status;
  try {
    originalResponse.headers.delete("Content-type");
    originalResponse.headers.delete("Content-Length");
    originalResponse.headers.delete("Transfer-Encoding");
  } catch {
  }
  const newHeaders = new Headers();
  const seen = /* @__PURE__ */ new Set();
  for (const [name, value] of originalResponse.headers) {
    newHeaders.append(name, value);
    seen.add(name.toLowerCase());
  }
  for (const [name, value] of newResponseHeaders) {
    if (!seen.has(name.toLowerCase())) {
      newHeaders.append(name, value);
    }
  }
  const mergedResponse = new Response(newResponse.body, {
    status,
    statusText: status === 200 ? newResponse.statusText : originalResponse.statusText,
    // If you're looking at here for possible bugs, it means that it's not a bug.
    // With the middleware, users can meddle with headers, and we should pass to the 404/500.
    // If users see something weird, it's because they are setting some headers they should not.
    //
    // Although, we don't want it to replace the content-type, because the error page must return `text/html`
    headers: newHeaders
  });
  const originalCookies = getCookiesFromResponse(originalResponse);
  const newCookies = getCookiesFromResponse(newResponse);
  if (originalCookies) {
    if (newCookies) {
      for (const cookieValue of newCookies.consume()) {
        originalResponse.headers.append("set-cookie", cookieValue);
      }
    }
    attachCookiesToResponse(mergedResponse, originalCookies);
  } else if (newCookies) {
    attachCookiesToResponse(mergedResponse, newCookies);
  }
  return mergedResponse;
}

class BaseApp {
  manifest;
  manifestData;
  pipeline;
  #adapterLogger;
  baseWithoutTrailingSlash;
  /**
   * The handler that turns incoming `Request` objects into `Response`s.
   * Defaults to a `DefaultFetchHandler` pinned to this app and can be
   * overridden via `setFetchHandler` — typically by the bundled
   * entrypoint after importing `virtual:astro:fetchable`.
   */
  #fetchHandler;
  #errorHandler;
  /**
   * Whether a custom fetch handler (from `src/app.ts`) has been set
   * via `setFetchHandler`. When false, the `DefaultFetchHandler` is
   * in use and all features are implicitly active.
   */
  #hasCustomFetchHandler = false;
  /**
   * Whether the missing-feature check has already run. We only want
   * to warn once — after the first request in dev, or at build end.
   */
  #featureCheckDone = false;
  get logger() {
    return this.pipeline.logger;
  }
  get adapterLogger() {
    if (!this.#adapterLogger) {
      this.#adapterLogger = new AstroIntegrationLogger(
        this.logger.options,
        this.manifest.adapterName
      );
    }
    return this.#adapterLogger;
  }
  constructor(manifest, streaming = true, ...args) {
    this.manifest = manifest;
    this.baseWithoutTrailingSlash = removeTrailingForwardSlash(manifest.base);
    this.pipeline = this.createPipeline(streaming, manifest, ...args);
    this.manifestData = this.pipeline.manifestData;
    this.#fetchHandler = new DefaultFetchHandler(this);
    this.#errorHandler = this.createErrorHandler();
  }
  /**
   * Override the fetch handler used to dispatch requests. Entrypoints
   * call this with the default export of `virtual:astro:fetchable` to
   * plug in a user-authored handler from `src/app.ts`.
   */
  setFetchHandler(handler) {
    this.#fetchHandler = handler;
    this.#hasCustomFetchHandler = !(handler instanceof DefaultFetchHandler);
  }
  /**
   * Returns the error handler strategy used by this app. Override to
   * provide environment-specific behavior (dev overlay, build-time throws, etc.).
   */
  createErrorHandler() {
    return new DefaultErrorHandler(this);
  }
  /**
   * Resets the cached adapter logger so it picks up a new logger instance.
   * Used by BuildApp when the logger is replaced via setOptions().
   */
  resetAdapterLogger() {
    this.#adapterLogger = void 0;
  }
  getAllowedDomains() {
    return this.manifest.allowedDomains;
  }
  matchesAllowedDomains(forwardedHost, protocol) {
    return BaseApp.validateForwardedHost(forwardedHost, this.manifest.allowedDomains, protocol);
  }
  static validateForwardedHost(forwardedHost, allowedDomains, protocol) {
    if (!allowedDomains || allowedDomains.length === 0) {
      return false;
    }
    try {
      const testUrl = new URL(`${protocol || "https"}://${forwardedHost}`);
      return allowedDomains.some((pattern) => {
        return matchPattern(testUrl, pattern);
      });
    } catch {
      return false;
    }
  }
  set setManifestData(newManifestData) {
    this.manifestData = newManifestData;
    this.pipeline.manifestData = newManifestData;
    this.pipeline.rebuildRouter();
  }
  removeBase(pathname) {
    pathname = collapseDuplicateLeadingSlashes(pathname);
    if (pathname.startsWith(this.manifest.base)) {
      return pathname.slice(this.baseWithoutTrailingSlash.length + 1);
    }
    return pathname;
  }
  /**
   * Extracts the base-stripped, decoded pathname from a request.
   * Used by adapters to compute the pathname for dev-mode route matching.
   */
  getPathnameFromRequest(request) {
    const url = new URL(request.url);
    const pathname = prependForwardSlash(this.removeBase(url.pathname));
    try {
      return decodeURI(pathname);
    } catch (e) {
      this.adapterLogger.error(e.toString());
      return pathname;
    }
  }
  /**
   * Given a `Request`, it returns the `RouteData` that matches its `pathname`. By default, prerendered
   * routes aren't returned, even if they are matched.
   *
   * When `allowPrerenderedRoutes` is `true`, the function returns matched prerendered routes too.
   * @param request
   * @param allowPrerenderedRoutes
   */
  match(request, allowPrerenderedRoutes = false) {
    const url = new URL(request.url);
    if (this.manifest.assets.has(url.pathname)) return void 0;
    let pathname = this.computePathnameFromDomain(request);
    if (!pathname) {
      pathname = prependForwardSlash(this.removeBase(url.pathname));
    }
    const routeData = this.pipeline.matchRoute(decodeURI(pathname));
    if (!routeData) return void 0;
    if (allowPrerenderedRoutes) {
      return routeData;
    }
    if (routeData.prerender) {
      return void 0;
    }
    return routeData;
  }
  /**
   * A matching route function to use in the development server.
   * Contrary to the `.match` function, this function resolves props and params, returning the correct
   * route based on the priority, segments. It also returns the correct, resolved pathname.
   * @param pathname
   */
  devMatch(pathname) {
    return void 0;
  }
  computePathnameFromDomain(request) {
    let pathname = void 0;
    const url = new URL(request.url);
    if (this.manifest.i18n && (this.manifest.i18n.strategy === "domains-prefix-always" || this.manifest.i18n.strategy === "domains-prefix-other-locales" || this.manifest.i18n.strategy === "domains-prefix-always-no-redirect")) {
      let host = request.headers.get("X-Forwarded-Host");
      let protocol = request.headers.get("X-Forwarded-Proto");
      if (protocol) {
        protocol = protocol + ":";
      } else {
        protocol = url.protocol;
      }
      if (!host) {
        host = request.headers.get("Host");
      }
      if (host && protocol) {
        host = host.split(":")[0];
        try {
          let locale;
          const hostAsUrl = new URL(`${protocol}//${host}`);
          for (const [domainKey, localeValue] of Object.entries(
            this.manifest.i18n.domainLookupTable
          )) {
            const domainKeyAsUrl = new URL(domainKey);
            if (hostAsUrl.host === domainKeyAsUrl.host && hostAsUrl.protocol === domainKeyAsUrl.protocol) {
              locale = localeValue;
              break;
            }
          }
          if (locale) {
            pathname = prependForwardSlash(
              joinPaths(normalizeTheLocale(locale), this.removeBase(url.pathname))
            );
            if (this.manifest.trailingSlash === "always") {
              pathname = appendForwardSlash(pathname);
            } else if (this.manifest.trailingSlash === "never") {
              pathname = removeTrailingForwardSlash(pathname);
            } else if (url.pathname.endsWith("/")) {
              pathname = appendForwardSlash(pathname);
            }
          }
        } catch (e) {
          this.logger.error(
            "router",
            `Astro tried to parse ${protocol}//${host} as an URL, but it threw a parsing error. Check the X-Forwarded-Host and X-Forwarded-Proto headers.`
          );
          this.logger.error("router", `Error: ${e}`);
        }
      }
    }
    return pathname;
  }
  async render(request, {
    addCookieHeader = false,
    clientAddress = Reflect.get(request, clientAddressSymbol),
    locals,
    prerenderedErrorPageFetch = fetch,
    routeData,
    waitUntil
  } = {}) {
    await this.pipeline.getLogger();
    if (routeData) {
      this.logger.debug(
        "router",
        "The adapter " + this.manifest.adapterName + " provided a custom RouteData for ",
        request.url
      );
      this.logger.debug("router", "RouteData");
      this.logger.debug("router", routeData);
    }
    if (locals) {
      if (typeof locals !== "object") {
        const error = new AstroError(LocalsNotAnObject);
        this.logger.error(null, error.stack);
        return this.renderError(request, {
          addCookieHeader,
          clientAddress,
          prerenderedErrorPageFetch,
          // If locals are invalid, we don't want to include them when
          // rendering the error page
          locals: void 0,
          routeData,
          waitUntil,
          status: 500,
          error
        });
      }
    }
    if (!routeData) {
      const domainPathname = this.computePathnameFromDomain(request);
      if (domainPathname) {
        routeData = this.pipeline.matchRoute(decodeURI(domainPathname));
      }
    }
    const resolvedOptions = {
      addCookieHeader,
      clientAddress,
      prerenderedErrorPageFetch,
      locals,
      routeData,
      waitUntil
    };
    let response;
    if (this.#fetchHandler instanceof DefaultFetchHandler) {
      Reflect.set(request, appSymbol, this);
      response = await this.#fetchHandler.renderWithOptions(request, resolvedOptions);
    } else {
      setRenderOptions(request, resolvedOptions);
      Reflect.set(request, appSymbol, this);
      response = await this.#fetchHandler.fetch(request);
    }
    this.#warnMissingFeatures();
    if (response.headers.get(ASTRO_ERROR_HEADER)) {
      response.headers.delete(ASTRO_ERROR_HEADER);
      return this.renderError(request, {
        addCookieHeader,
        clientAddress,
        prerenderedErrorPageFetch,
        locals,
        routeData,
        waitUntil,
        response,
        status: response.status,
        error: response.status === 500 ? null : void 0
      });
    }
    return response;
  }
  setCookieHeaders(response) {
    return getSetCookiesFromResponse(response);
  }
  /**
   * Reads all the cookies written by `Astro.cookie.set()` onto the passed response.
   * For example,
   * ```ts
   * for (const cookie_ of App.getSetCookieFromResponse(response)) {
   *     const cookie: string = cookie_
   * }
   * ```
   * @param response The response to read cookies from.
   * @returns An iterator that yields key-value pairs as equal-sign-separated strings.
   */
  static getSetCookieFromResponse = getSetCookiesFromResponse;
  /**
   * If it is a known error code, try sending the according page (e.g. 404.astro / 500.astro).
   * This also handles pre-rendered /404 or /500 routes.
   *
   * Delegates to the app's configured `ErrorHandler`. To customize behavior
   * for a specific environment, override `createErrorHandler()` rather than
   * this method.
   */
  async renderError(request, options) {
    return this.#errorHandler.renderError(request, options);
  }
  /**
   * One-shot check: after the first request with a custom `src/app.ts`,
   * compare `usedFeatures` against the manifest and warn about any
   * configured features the user's pipeline doesn't call.
   */
  #warnMissingFeatures() {
    if (this.#featureCheckDone || !this.#hasCustomFetchHandler) return;
    this.#featureCheckDone = true;
    const manifest = this.manifest;
    const missing = [];
    const used = this.pipeline.usedFeatures;
    if (manifest.routes.some((r) => r.routeData.type === "redirect") && !(used & PipelineFeatures.redirects)) {
      missing.push("redirects");
    }
    if (manifest.sessionConfig && !(used & PipelineFeatures.sessions)) {
      missing.push("sessions");
    }
    if (manifest.actions && !(used & PipelineFeatures.actions)) {
      missing.push("actions");
    }
    if (manifest.middleware && !(used & PipelineFeatures.middleware)) {
      missing.push("middleware");
    }
    if (manifest.i18n && manifest.i18n.strategy !== "manual" && !(used & PipelineFeatures.i18n)) {
      missing.push("i18n");
    }
    if (manifest.cacheConfig && !(used & PipelineFeatures.cache)) {
      missing.push("cache");
    }
    for (const feature of missing) {
      this.logger.warn(
        "router",
        `Your project uses ${feature}, but your custom src/app.ts does not call the ${feature}() handler. This feature will not work unless you add it to your app.ts pipeline.`
      );
    }
  }
  getDefaultStatusCode(routeData, pathname) {
    if (!routeData.pattern.test(pathname)) {
      for (const fallbackRoute of routeData.fallbackRoutes) {
        if (fallbackRoute.pattern.test(pathname)) {
          return 302;
        }
      }
    }
    const route = removeTrailingForwardSlash(routeData.route);
    if (route.endsWith("/404")) return 404;
    if (route.endsWith("/500")) return 500;
    return 200;
  }
  getManifest() {
    return this.pipeline.manifest;
  }
  logThisRequest({
    pathname,
    method,
    statusCode,
    isRewrite,
    timeStart
  }) {
    const timeEnd = performance.now();
    this.logRequest({
      pathname,
      method,
      statusCode,
      isRewrite,
      reqTime: timeEnd - timeStart
    });
  }
}

function getAssetsPrefix(fileExtension, assetsPrefix) {
  let prefix = "";
  if (!assetsPrefix) {
    prefix = "";
  } else if (typeof assetsPrefix === "string") {
    prefix = assetsPrefix;
  } else {
    const dotLessFileExtension = fileExtension.slice(1);
    prefix = assetsPrefix[dotLessFileExtension] || assetsPrefix.fallback;
  }
  return prefix;
}

const URL_PARSE_BASE = "https://astro.build";
function splitAssetPath(path) {
  const parsed = new URL(path, URL_PARSE_BASE);
  const isAbsolute = URL.canParse(path);
  const pathname = !isAbsolute && !path.startsWith("/") ? parsed.pathname.slice(1) : parsed.pathname;
  return {
    pathname,
    suffix: `${parsed.search}${parsed.hash}`
  };
}
function createAssetLink(href, base, assetsPrefix, queryParams) {
  const { pathname, suffix } = splitAssetPath(href);
  let url = "";
  if (assetsPrefix) {
    const pf = getAssetsPrefix(fileExtension(pathname), assetsPrefix);
    url = joinPaths(pf, slash(pathname)) + suffix;
  } else if (base) {
    url = prependForwardSlash(joinPaths(base, slash(pathname))) + suffix;
  } else {
    url = href;
  }
  return url;
}
function createStylesheetElement(stylesheet, base, assetsPrefix, queryParams) {
  if (stylesheet.type === "inline") {
    return {
      props: {},
      children: stylesheet.content
    };
  } else {
    return {
      props: {
        rel: "stylesheet",
        href: createAssetLink(stylesheet.src, base, assetsPrefix)
      },
      children: ""
    };
  }
}
function createStylesheetElementSet(stylesheets, base, assetsPrefix, queryParams) {
  return new Set(
    stylesheets.map((s) => createStylesheetElement(s, base, assetsPrefix))
  );
}
function createModuleScriptElement(script, base, assetsPrefix, queryParams) {
  if (script.type === "external") {
    return createModuleScriptElementWithSrc(script.value, base, assetsPrefix);
  } else {
    return {
      props: {
        type: "module"
      },
      children: script.value
    };
  }
}
function createModuleScriptElementWithSrc(src, base, assetsPrefix, queryParams) {
  return {
    props: {
      type: "module",
      src: createAssetLink(src, base, assetsPrefix)
    },
    children: ""
  };
}

class AppPipeline extends Pipeline {
  getName() {
    return "AppPipeline";
  }
  static create({ manifest, streaming }) {
    const resolve = async function resolve2(specifier) {
      if (!(specifier in manifest.entryModules)) {
        throw new Error(`Unable to resolve [${specifier}]`);
      }
      const bundlePath = manifest.entryModules[specifier];
      if (bundlePath.startsWith("data:") || bundlePath.length === 0) {
        return bundlePath;
      } else {
        return createAssetLink(bundlePath, manifest.base, manifest.assetsPrefix);
      }
    };
    const logger = createConsoleLogger({ level: manifest.logLevel });
    const pipeline = new AppPipeline(
      logger,
      manifest,
      "production",
      manifest.renderers,
      resolve,
      streaming,
      void 0,
      void 0,
      void 0,
      void 0,
      void 0,
      void 0,
      void 0,
      void 0
    );
    return pipeline;
  }
  async headElements(routeData) {
    const { assetsPrefix, base } = this.manifest;
    const routeInfo = this.manifest.routes.find(
      (route) => route.routeData.route === routeData.route
    );
    const links = /* @__PURE__ */ new Set();
    const scripts = /* @__PURE__ */ new Set();
    const styles = createStylesheetElementSet(routeInfo?.styles ?? [], base, assetsPrefix);
    for (const script of routeInfo?.scripts ?? []) {
      if ("stage" in script) {
        if (script.stage === "head-inline") {
          scripts.add({
            props: {},
            children: script.children
          });
        }
      } else {
        scripts.add(createModuleScriptElement(script, base, assetsPrefix));
      }
    }
    return { links, styles, scripts };
  }
  componentMetadata() {
  }
  async getComponentByRoute(routeData) {
    const module = await this.getModuleForRoute(routeData);
    return module.page();
  }
  async getModuleForRoute(route) {
    for (const defaultRoute of this.defaultRoutes) {
      if (route.component === defaultRoute.component) {
        return {
          page: () => Promise.resolve(defaultRoute.instance)
        };
      }
    }
    let routeToProcess = route;
    if (routeIsRedirect(route)) {
      if (route.redirectRoute) {
        routeToProcess = route.redirectRoute;
      } else {
        return RedirectSinglePageBuiltModule;
      }
    } else if (routeIsFallback(route)) {
      routeToProcess = getFallbackRoute(route, this.manifest.routes);
    }
    if (this.manifest.pageMap) {
      const importComponentInstance = this.manifest.pageMap.get(routeToProcess.component);
      if (!importComponentInstance) {
        throw new Error(
          `Unexpectedly unable to find a component instance for route ${route.route}`
        );
      }
      return await importComponentInstance();
    } else if (this.manifest.pageModule) {
      return this.manifest.pageModule;
    }
    throw new Error(
      "Astro couldn't find the correct page to render, probably because it wasn't correctly mapped for SSR usage. This is an internal error, please file an issue."
    );
  }
  async tryRewrite(payload, request) {
    const { newUrl, pathname, routeData } = findRouteToRewrite({
      payload,
      request,
      routes: this.manifest?.routes.map((r) => r.routeData),
      trailingSlash: this.manifest.trailingSlash,
      buildFormat: this.manifest.buildFormat,
      base: this.manifest.base,
      outDir: this.manifest?.serverLike ? this.manifest.buildClientDir : this.manifest.outDir
    });
    const componentInstance = await this.getComponentByRoute(routeData);
    return { newUrl, pathname, componentInstance, routeData };
  }
}

class App extends BaseApp {
  createPipeline(streaming) {
    return AppPipeline.create({
      manifest: this.manifest,
      streaming
    });
  }
  isDev() {
    return false;
  }
  // Should we log something for our users?
  logRequest(_options) {
  }
}

const slotName = (str) => str.trim().replace(/[-_]([a-z])/g, (_, w) => w.toUpperCase());
async function check(Component, props, { default: children = null, ...slotted } = {}) {
  if (typeof Component !== "function") return false;
  const slots = {};
  for (const [key, value] of Object.entries(slotted)) {
    const name = slotName(key);
    slots[name] = value;
  }
  try {
    const result = await Component({ ...props, ...slots, children });
    return result[AstroJSX];
  } catch (e) {
    throwEnhancedErrorIfMdxComponent(e, Component);
  }
  return false;
}
async function renderToStaticMarkup(Component, props = {}, { default: children = null, ...slotted } = {}) {
  const slots = {};
  for (const [key, value] of Object.entries(slotted)) {
    const name = slotName(key);
    slots[name] = value;
  }
  const { result } = this;
  try {
    const html = await renderJSX(result, createVNode(Component, { ...props, ...slots, children }));
    return { html };
  } catch (e) {
    throwEnhancedErrorIfMdxComponent(e, Component);
    throw e;
  }
}
function throwEnhancedErrorIfMdxComponent(error, Component) {
  if (Component[/* @__PURE__ */ Symbol.for("mdx-component")]) {
    if (AstroUserError.is(error)) return;
    error.title = error.name;
    error.hint = `This issue often occurs when your MDX component encounters runtime errors.`;
    throw error;
  }
}
const renderer = {
  name: "astro:jsx",
  check,
  renderToStaticMarkup
};
var server_default = renderer;

const renderers = [Object.assign({"name":"astro:jsx","serverEntrypoint":"file:///Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/node_modules/@astrojs/mdx/dist/server.js"}, { ssr: server_default }),];

const serializedData = [{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"type":"page","component":"_server-islands.astro","params":["name"],"segments":[[{"content":"_server-islands","dynamic":false,"spread":false}],[{"content":"name","dynamic":true,"spread":false}]],"pattern":"^\\/_server-islands\\/([^/]+?)$","prerender":false,"isIndex":false,"fallbackRoutes":[],"route":"/_server-islands/[name]","origin":"internal","distURL":[],"_meta":{"trailingSlash":"never"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/_image","component":"node_modules/astro/dist/assets/endpoint/generic.js","params":[],"pathname":"/_image","pattern":"^\\/_image$","segments":[[{"content":"_image","dynamic":false,"spread":false}]],"type":"endpoint","prerender":false,"fallbackRoutes":[],"distURL":[],"isIndex":false,"origin":"internal","_meta":{"trailingSlash":"never"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"type":"endpoint","isIndex":false,"route":"/api/keystatic/[...params]","pattern":"^\\/api\\/keystatic(?:\\/(.*?))?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"keystatic","dynamic":false,"spread":false}],[{"content":"...params","dynamic":true,"spread":true}]],"params":["...params"],"component":"node_modules/@keystatic/astro/internal/keystatic-api.js","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"external","_meta":{"trailingSlash":"never"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"type":"page","isIndex":false,"route":"/keystatic/[...params]","pattern":"^\\/keystatic(?:\\/(.*?))?$","segments":[[{"content":"keystatic","dynamic":false,"spread":false}],[{"content":"...params","dynamic":true,"spread":true}]],"params":["...params"],"component":"node_modules/@keystatic/astro/internal/keystatic-astro-page.astro","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"external","_meta":{"trailingSlash":"never"}}}];
				serializedData.map(deserializeRouteInfo);

const _page0 = () => import('./generic_ByNV1I31.mjs').then(n => n.g);
const _page1 = () => import('./keystatic-api_DIzftG75.mjs');
const _page2 = () => import('./keystatic-astro-page_DG8RHKzW.mjs');
const pageMap = new Map([
    ["node_modules/astro/dist/assets/endpoint/generic.js", _page0],
    ["node_modules/@keystatic/astro/internal/keystatic-api.js", _page1],
    ["node_modules/@keystatic/astro/internal/keystatic-astro-page.astro", _page2]
]);

const _manifest = deserializeManifest(({"rootDir":"file:///Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/","cacheDir":"file:///Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/node_modules/.astro/","outDir":"file:///Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/dist/","srcDir":"file:///Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/","publicDir":"file:///Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/public/","buildClientDir":"file:///Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/dist/client/","buildServerDir":"file:///Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/dist/server/","adapterName":"@astrojs/vercel","assetsDir":"_astro","routes":[{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"type":"page","component":"_server-islands.astro","params":["name"],"segments":[[{"content":"_server-islands","dynamic":false,"spread":false}],[{"content":"name","dynamic":true,"spread":false}]],"pattern":"^\\/_server-islands\\/([^/]+?)$","prerender":false,"isIndex":false,"fallbackRoutes":[],"route":"/_server-islands/[name]","origin":"internal","distURL":[],"_meta":{"trailingSlash":"never"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/_image","component":"node_modules/astro/dist/assets/endpoint/generic.js","params":[],"pathname":"/_image","pattern":"^\\/_image$","segments":[[{"content":"_image","dynamic":false,"spread":false}]],"type":"endpoint","prerender":false,"fallbackRoutes":[],"distURL":[],"isIndex":false,"origin":"internal","_meta":{"trailingSlash":"never"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/404","isIndex":false,"type":"page","pattern":"^\\/404$","segments":[[{"content":"404","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/404.astro","pathname":"/404","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"never"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/about","isIndex":false,"type":"page","pattern":"^\\/about$","segments":[[{"content":"about","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/about.astro","pathname":"/about","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"never"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"type":"endpoint","isIndex":false,"route":"/api/keystatic/[...params]","pattern":"^\\/api\\/keystatic(?:\\/(.*?))?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"keystatic","dynamic":false,"spread":false}],[{"content":"...params","dynamic":true,"spread":true}]],"params":["...params"],"component":"node_modules/@keystatic/astro/internal/keystatic-api.js","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"external","_meta":{"trailingSlash":"never"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/contact","isIndex":false,"type":"page","pattern":"^\\/contact$","segments":[[{"content":"contact","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/contact.astro","pathname":"/contact","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"never"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/homes/mobile-app","isIndex":false,"type":"page","pattern":"^\\/homes\\/mobile-app$","segments":[[{"content":"homes","dynamic":false,"spread":false}],[{"content":"mobile-app","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/homes/mobile-app.astro","pathname":"/homes/mobile-app","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"never"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/homes/personal","isIndex":false,"type":"page","pattern":"^\\/homes\\/personal$","segments":[[{"content":"homes","dynamic":false,"spread":false}],[{"content":"personal","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/homes/personal.astro","pathname":"/homes/personal","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"never"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/homes/saas","isIndex":false,"type":"page","pattern":"^\\/homes\\/saas$","segments":[[{"content":"homes","dynamic":false,"spread":false}],[{"content":"saas","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/homes/saas.astro","pathname":"/homes/saas","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"never"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/homes/startup","isIndex":false,"type":"page","pattern":"^\\/homes\\/startup$","segments":[[{"content":"homes","dynamic":false,"spread":false}],[{"content":"startup","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/homes/startup.astro","pathname":"/homes/startup","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"never"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"type":"page","isIndex":false,"route":"/keystatic/[...params]","pattern":"^\\/keystatic(?:\\/(.*?))?$","segments":[[{"content":"keystatic","dynamic":false,"spread":false}],[{"content":"...params","dynamic":true,"spread":true}]],"params":["...params"],"component":"node_modules/@keystatic/astro/internal/keystatic-astro-page.astro","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"external","_meta":{"trailingSlash":"never"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/landing/click-through","isIndex":false,"type":"page","pattern":"^\\/landing\\/click-through$","segments":[[{"content":"landing","dynamic":false,"spread":false}],[{"content":"click-through","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/landing/click-through.astro","pathname":"/landing/click-through","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"never"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/landing/lead-generation","isIndex":false,"type":"page","pattern":"^\\/landing\\/lead-generation$","segments":[[{"content":"landing","dynamic":false,"spread":false}],[{"content":"lead-generation","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/landing/lead-generation.astro","pathname":"/landing/lead-generation","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"never"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/landing/pre-launch","isIndex":false,"type":"page","pattern":"^\\/landing\\/pre-launch$","segments":[[{"content":"landing","dynamic":false,"spread":false}],[{"content":"pre-launch","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/landing/pre-launch.astro","pathname":"/landing/pre-launch","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"never"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/landing/product","isIndex":false,"type":"page","pattern":"^\\/landing\\/product$","segments":[[{"content":"landing","dynamic":false,"spread":false}],[{"content":"product","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/landing/product.astro","pathname":"/landing/product","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"never"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/landing/sales","isIndex":false,"type":"page","pattern":"^\\/landing\\/sales$","segments":[[{"content":"landing","dynamic":false,"spread":false}],[{"content":"sales","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/landing/sales.astro","pathname":"/landing/sales","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"never"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/landing/subscription","isIndex":false,"type":"page","pattern":"^\\/landing\\/subscription$","segments":[[{"content":"landing","dynamic":false,"spread":false}],[{"content":"subscription","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/landing/subscription.astro","pathname":"/landing/subscription","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"never"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/locations/[slug]","isIndex":true,"type":"page","pattern":"^\\/locations\\/([^/]+?)$","segments":[[{"content":"locations","dynamic":false,"spread":false}],[{"content":"slug","dynamic":true,"spread":false}]],"params":["slug"],"component":"src/pages/locations/[slug]/index.astro","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"never"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/locations","isIndex":true,"type":"page","pattern":"^\\/locations$","segments":[[{"content":"locations","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/locations/index.astro","pathname":"/locations","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"never"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/map","isIndex":false,"type":"page","pattern":"^\\/map$","segments":[[{"content":"map","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/map.astro","pathname":"/map","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"never"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/pricing","isIndex":false,"type":"page","pattern":"^\\/pricing$","segments":[[{"content":"pricing","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/pricing.astro","pathname":"/pricing","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"never"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/privacy","isIndex":false,"type":"page","pattern":"^\\/privacy$","segments":[[{"content":"privacy","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/privacy.md","pathname":"/privacy","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"never"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/rss.xml","isIndex":false,"type":"endpoint","pattern":"^\\/rss\\.xml$","segments":[[{"content":"rss.xml","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/rss.xml.ts","pathname":"/rss.xml","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"never"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/search","isIndex":false,"type":"page","pattern":"^\\/search$","segments":[[{"content":"search","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/search.astro","pathname":"/search","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"never"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/services","isIndex":false,"type":"page","pattern":"^\\/services$","segments":[[{"content":"services","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/services.astro","pathname":"/services","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"never"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/terms","isIndex":false,"type":"page","pattern":"^\\/terms$","segments":[[{"content":"terms","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/terms.md","pathname":"/terms","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"never"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/[...blog]/[category]/[...page]","isIndex":false,"type":"page","pattern":"^(?:\\/(.*?))?\\/([^/]+?)(?:\\/(.*?))?$","segments":[[{"content":"...blog","dynamic":true,"spread":true}],[{"content":"category","dynamic":true,"spread":false}],[{"content":"...page","dynamic":true,"spread":true}]],"params":["...blog","category","...page"],"component":"src/pages/[...blog]/[category]/[...page].astro","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"never"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/[...blog]/[tag]/[...page]","isIndex":false,"type":"page","pattern":"^(?:\\/(.*?))?\\/([^/]+?)(?:\\/(.*?))?$","segments":[[{"content":"...blog","dynamic":true,"spread":true}],[{"content":"tag","dynamic":true,"spread":false}],[{"content":"...page","dynamic":true,"spread":true}]],"params":["...blog","tag","...page"],"component":"src/pages/[...blog]/[tag]/[...page].astro","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"never"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/[...blog]/[...page]","isIndex":false,"type":"page","pattern":"^(?:\\/(.*?))?(?:\\/(.*?))?$","segments":[[{"content":"...blog","dynamic":true,"spread":true}],[{"content":"...page","dynamic":true,"spread":true}]],"params":["...blog","...page"],"component":"src/pages/[...blog]/[...page].astro","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"never"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/","isIndex":true,"type":"page","pattern":"^\\/$","segments":[],"params":[],"component":"src/pages/index.astro","pathname":"/","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"never"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/[...blog]","isIndex":true,"type":"page","pattern":"^(?:\\/(.*?))?$","segments":[[{"content":"...blog","dynamic":true,"spread":true}]],"params":["...blog"],"component":"src/pages/[...blog]/index.astro","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"never"}}}],"serverLike":true,"middlewareMode":"classic","site":"https://www.riplosangeles.com","base":"/","trailingSlash":"never","compressHTML":true,"experimentalQueuedRendering":{"enabled":false,"poolSize":0,"contentCache":false},"componentMetadata":[["/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/pages/landing/click-through.astro",{"propagation":"none","containsHead":true}],["/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/pages/landing/lead-generation.astro",{"propagation":"none","containsHead":true}],["/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/pages/landing/pre-launch.astro",{"propagation":"none","containsHead":true}],["/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/pages/landing/product.astro",{"propagation":"none","containsHead":true}],["/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/pages/landing/sales.astro",{"propagation":"none","containsHead":true}],["/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/pages/landing/subscription.astro",{"propagation":"none","containsHead":true}],["/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/pages/privacy.md",{"propagation":"none","containsHead":true}],["/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/pages/terms.md",{"propagation":"none","containsHead":true}],["/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/pages/[...blog]/[...page].astro",{"propagation":"in-tree","containsHead":true}],["/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/pages/[...blog]/[category]/[...page].astro",{"propagation":"in-tree","containsHead":true}],["/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/pages/[...blog]/[tag]/[...page].astro",{"propagation":"in-tree","containsHead":true}],["/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/pages/[...blog]/index.astro",{"propagation":"in-tree","containsHead":true}],["/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/pages/about.astro",{"propagation":"none","containsHead":true}],["/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/pages/contact.astro",{"propagation":"none","containsHead":true}],["/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/pages/homes/mobile-app.astro",{"propagation":"none","containsHead":true}],["/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/pages/homes/personal.astro",{"propagation":"in-tree","containsHead":true}],["/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/pages/homes/saas.astro",{"propagation":"in-tree","containsHead":true}],["/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/pages/homes/startup.astro",{"propagation":"none","containsHead":true}],["/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/pages/index.astro",{"propagation":"in-tree","containsHead":true}],["/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/pages/locations/[slug]/index.astro",{"propagation":"in-tree","containsHead":true}],["/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/pages/locations/index.astro",{"propagation":"in-tree","containsHead":true}],["/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/pages/map.astro",{"propagation":"in-tree","containsHead":true}],["/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/pages/pricing.astro",{"propagation":"none","containsHead":true}],["/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/pages/search.astro",{"propagation":"none","containsHead":true}],["/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/pages/services.astro",{"propagation":"none","containsHead":true}],["/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/pages/404.astro",{"propagation":"none","containsHead":true}],["\u0000astro:content",{"propagation":"in-tree","containsHead":false}],["\u0000virtual:astro:page:src/pages/locations/[slug]/index@_@astro",{"propagation":"in-tree","containsHead":false}],["\u0000virtual:astro:pages",{"propagation":"in-tree","containsHead":false}],["\u0000virtual:astro:manifest",{"propagation":"in-tree","containsHead":false}],["/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/node_modules/astro/dist/entrypoints/prerender.js",{"propagation":"in-tree","containsHead":false}],["\u0000virtual:astro:page:src/pages/locations/index@_@astro",{"propagation":"in-tree","containsHead":false}],["/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/utils/blog.ts",{"propagation":"in-tree","containsHead":false}],["/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/components/blog/RelatedPosts.astro",{"propagation":"in-tree","containsHead":false}],["\u0000virtual:astro:page:src/pages/[...blog]/index@_@astro",{"propagation":"in-tree","containsHead":false}],["/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/components/widgets/BlogHighlightedPosts.astro",{"propagation":"in-tree","containsHead":false}],["/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/components/widgets/BlogLatestPosts.astro",{"propagation":"in-tree","containsHead":false}],["\u0000virtual:astro:page:src/pages/homes/personal@_@astro",{"propagation":"in-tree","containsHead":false}],["\u0000virtual:astro:page:src/pages/homes/saas@_@astro",{"propagation":"in-tree","containsHead":false}],["\u0000virtual:astro:page:src/pages/[...blog]/[...page]@_@astro",{"propagation":"in-tree","containsHead":false}],["\u0000virtual:astro:page:src/pages/[...blog]/[category]/[...page]@_@astro",{"propagation":"in-tree","containsHead":false}],["\u0000virtual:astro:page:src/pages/[...blog]/[tag]/[...page]@_@astro",{"propagation":"in-tree","containsHead":false}],["\u0000virtual:astro:page:src/pages/index@_@astro",{"propagation":"in-tree","containsHead":false}],["\u0000virtual:astro:page:src/pages/map@_@astro",{"propagation":"in-tree","containsHead":false}],["/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/pages/rss.xml.ts",{"propagation":"in-tree","containsHead":false}],["\u0000virtual:astro:page:src/pages/rss.xml@_@ts",{"propagation":"in-tree","containsHead":false}]],"renderers":[],"clientDirectives":[["idle","(()=>{var l=(n,t)=>{let i=async()=>{await(await n())()},e=typeof t.value==\"object\"?t.value:void 0,s={timeout:e==null?void 0:e.timeout};\"requestIdleCallback\"in window?window.requestIdleCallback(i,s):setTimeout(i,s.timeout||200)};(self.Astro||(self.Astro={})).idle=l;window.dispatchEvent(new Event(\"astro:idle\"));})();"],["load","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).load=e;window.dispatchEvent(new Event(\"astro:load\"));})();"],["media","(()=>{var n=(a,t)=>{let i=async()=>{await(await a())()};if(t.value){let e=matchMedia(t.value);e.matches?i():e.addEventListener(\"change\",i,{once:!0})}};(self.Astro||(self.Astro={})).media=n;window.dispatchEvent(new Event(\"astro:media\"));})();"],["only","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).only=e;window.dispatchEvent(new Event(\"astro:only\"));})();"],["visible","(()=>{var a=(s,i,o)=>{let r=async()=>{await(await s())()},t=typeof i.value==\"object\"?i.value:void 0,c={rootMargin:t==null?void 0:t.rootMargin},n=new IntersectionObserver(e=>{for(let l of e)if(l.isIntersecting){n.disconnect(),r();break}},c);for(let e of o.children)n.observe(e)};(self.Astro||(self.Astro={})).visible=a;window.dispatchEvent(new Event(\"astro:visible\"));})();"]],"entryModules":{"\u0000virtual:astro:actions/noop-entrypoint":"chunks/noop-entrypoint_BOlrdqWF.mjs","\u0000noop-middleware":"virtual_astro_middleware.mjs","\u0000virtual:astro:session-driver":"chunks/_virtual_astro_session-driver_DYx9Bb3p.mjs","\u0000virtual:astro:server-island-manifest":"chunks/_virtual_astro_server-island-manifest_CQQ1F5PF.mjs","\u0000virtual:astro:page:src/pages/404@_@astro":"chunks/404_DkUoQsEy.mjs","\u0000virtual:astro:page:src/pages/about@_@astro":"chunks/about_C8274B6R.mjs","\u0000virtual:astro:page:src/pages/contact@_@astro":"chunks/contact_CzQ25ORI.mjs","\u0000virtual:astro:page:src/pages/homes/mobile-app@_@astro":"chunks/mobile-app_CeD55Mfa.mjs","\u0000virtual:astro:page:src/pages/homes/personal@_@astro":"chunks/personal_yu-MDERm.mjs","\u0000virtual:astro:page:src/pages/homes/saas@_@astro":"chunks/saas_aWVGs79T.mjs","\u0000virtual:astro:page:src/pages/homes/startup@_@astro":"chunks/startup_BoOKSH8d.mjs","\u0000virtual:astro:page:src/pages/landing/click-through@_@astro":"chunks/click-through_CsuHDJgg.mjs","\u0000virtual:astro:page:src/pages/landing/lead-generation@_@astro":"chunks/lead-generation_CLkBUsTq.mjs","\u0000virtual:astro:page:src/pages/landing/pre-launch@_@astro":"chunks/pre-launch_BIAecHkt.mjs","\u0000virtual:astro:page:src/pages/landing/product@_@astro":"chunks/product_D-AcLdLG.mjs","\u0000virtual:astro:page:src/pages/landing/sales@_@astro":"chunks/sales_CENHRM-h.mjs","\u0000virtual:astro:page:src/pages/landing/subscription@_@astro":"chunks/subscription_Cu3fKrtk.mjs","\u0000virtual:astro:page:src/pages/locations/[slug]/index@_@astro":"chunks/index_80gWbO-Q.mjs","\u0000virtual:astro:page:src/pages/locations/index@_@astro":"chunks/index_DQl3qv2t.mjs","\u0000virtual:astro:page:src/pages/map@_@astro":"chunks/map_CEcJLfBw.mjs","\u0000virtual:astro:page:src/pages/pricing@_@astro":"chunks/pricing_2C8ZUq74.mjs","\u0000virtual:astro:page:src/pages/privacy@_@md":"chunks/privacy_DxX181_Y.mjs","\u0000virtual:astro:page:src/pages/rss.xml@_@ts":"chunks/rss_DOjl9gvJ.mjs","\u0000virtual:astro:page:src/pages/search@_@astro":"chunks/search_DYmmmhcW.mjs","\u0000virtual:astro:page:src/pages/services@_@astro":"chunks/services_B8Mhxjow.mjs","\u0000virtual:astro:page:src/pages/terms@_@md":"chunks/terms_CnKJwM4U.mjs","\u0000virtual:astro:page:src/pages/[...blog]/[category]/[...page]@_@astro":"chunks/_.._Bdv9O6SU.mjs","\u0000virtual:astro:page:src/pages/[...blog]/[tag]/[...page]@_@astro":"chunks/_.._BA2hT_N5.mjs","\u0000virtual:astro:page:src/pages/[...blog]/[...page]@_@astro":"chunks/_.._ypg568jN.mjs","\u0000virtual:astro:page:src/pages/index@_@astro":"chunks/index_DRD-8RE3.mjs","\u0000virtual:astro:page:src/pages/[...blog]/index@_@astro":"chunks/index_BQ6SFfNN.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/app-store.png":"chunks/app-store_U42frRjV.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/008a40d14430a2258a70700cc20fbb57f2173dc6.jpg":"chunks/008a40d14430a2258a70700cc20fbb57f2173dc6_jT6B_aC0.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/00c36666587607758dad110905629fc782ad74f4.jpg":"chunks/00c36666587607758dad110905629fc782ad74f4_jURk75gr.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/00f90a3a86c8b0746e5ca3cb1be7dec434bd1618.jpg":"chunks/00f90a3a86c8b0746e5ca3cb1be7dec434bd1618_CkcDMGfy.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/010d745cc3633c7e65c4f725fee5ba9d68d4ef79.jpg":"chunks/010d745cc3633c7e65c4f725fee5ba9d68d4ef79_CHEKF6ou.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/01515814add7deb331bd90ad7fb5b899267a0842.jpg":"chunks/01515814add7deb331bd90ad7fb5b899267a0842_D5eZS4Ef.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/01531b6a53899c0762cca3b5fa743cb70216a98a.jpg":"chunks/01531b6a53899c0762cca3b5fa743cb70216a98a_CsREVGRO.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/0162d7149ab70947623d9b7ccdafa93d559ba4c2.jpg":"chunks/0162d7149ab70947623d9b7ccdafa93d559ba4c2_CfGnBXaA.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/0179073f81f3e8295967bb959bfbf09d53ba4c24.jpg":"chunks/0179073f81f3e8295967bb959bfbf09d53ba4c24_DX7hHHGS.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/023c02aeb28baeea21ebc19c9d197d79839df088.jpg":"chunks/023c02aeb28baeea21ebc19c9d197d79839df088_DEuc_9YZ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/023e6fdd1356781c476ec09bf1a663895bda7868.jpg":"chunks/023e6fdd1356781c476ec09bf1a663895bda7868_BZMklm4R.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/02430d203a310bd865817aa352bd0b969f89e2ae.jpg":"chunks/02430d203a310bd865817aa352bd0b969f89e2ae_cUj_bFTa.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/028990fcb181487b0315fd9a763d4bfefdfab21b.jpg":"chunks/028990fcb181487b0315fd9a763d4bfefdfab21b_8WKvqO26.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/02f8c34ee1b0d42f849ae5c7b5f75adcb5b830f4.jpg":"chunks/02f8c34ee1b0d42f849ae5c7b5f75adcb5b830f4_i7W3aMv7.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/033f54e9ec1dff5cba56d609558e0bd70a4aeb97.jpg":"chunks/033f54e9ec1dff5cba56d609558e0bd70a4aeb97_Bk6Sl-XY.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/03613248b3bc02a7a24793424ad6184613f97449.jpg":"chunks/03613248b3bc02a7a24793424ad6184613f97449_CkKXQ_N6.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/03c6a714a26da8a461e1d89fafee588d9e54a57a.jpg":"chunks/03c6a714a26da8a461e1d89fafee588d9e54a57a_Dt1CYR46.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/0403780ccb6eac246ec9a3e8e1ae0fc916706585.jpg":"chunks/0403780ccb6eac246ec9a3e8e1ae0fc916706585_NKjgSUwy.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/043b8508277c267d1fc1325b48dda3f33bf9051f.jpg":"chunks/043b8508277c267d1fc1325b48dda3f33bf9051f_Cr4J8HVJ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/044b4f5c3aaa88a7f0a2222cdac10df39aab3d23.jpg":"chunks/044b4f5c3aaa88a7f0a2222cdac10df39aab3d23_DY1YF416.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/044c6d3cdb855799657f911c68fb2a062ab41152.jpg":"chunks/044c6d3cdb855799657f911c68fb2a062ab41152_BK1TCcsr.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/04547f33b935e22df92fa23f0c207f3a5d2f5f42.jpg":"chunks/04547f33b935e22df92fa23f0c207f3a5d2f5f42_DMTHYjT7.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/045ac1840dca1d71a7543f7912cfd72a94a1194e.jpg":"chunks/045ac1840dca1d71a7543f7912cfd72a94a1194e_BHbI8GYU.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/048c36bd1706ffb8f5e1ab4a4a96e27a725ba0b9.jpg":"chunks/048c36bd1706ffb8f5e1ab4a4a96e27a725ba0b9_C4j2Ja3j.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/04c2d35d2e2563ce581bdd9bd5c4f607bdb40050.jpg":"chunks/04c2d35d2e2563ce581bdd9bd5c4f607bdb40050_Bc6fVWby.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/0568dae5b9a492d8b1b4bcb2844599e2b0f7351a.png":"chunks/0568dae5b9a492d8b1b4bcb2844599e2b0f7351a_CzYZChHk.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/06788b010048ebc5b5b379dc46e733f6fab2022f.jpg":"chunks/06788b010048ebc5b5b379dc46e733f6fab2022f_DdCOg-rt.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/06afeab0bbeadf09a0863a996db708e272e28c37.jpg":"chunks/06afeab0bbeadf09a0863a996db708e272e28c37_Csimf2M-.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/070eef856fa8402a5fef4fd1b0046167d11fb52c.jpg":"chunks/070eef856fa8402a5fef4fd1b0046167d11fb52c_CQQoOpf3.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/074a05fda51cf31c1df0621817cdbae2933b1fb7.jpg":"chunks/074a05fda51cf31c1df0621817cdbae2933b1fb7_DHfJ2kdf.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/07975fa2ea05c23e1ef95d5beda108c3f8d5fdde.jpg":"chunks/07975fa2ea05c23e1ef95d5beda108c3f8d5fdde_DR4F6Avt.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/0807320923aa04e416febc9aafa3ee95947862c4.jpg":"chunks/0807320923aa04e416febc9aafa3ee95947862c4_ChxOoQVv.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/086d8125ca64106ba79d4d0aa0ba8a04d678ae42.jpg":"chunks/086d8125ca64106ba79d4d0aa0ba8a04d678ae42_DMl5jbxd.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/08c9a8982ca48848e26724d8bed4bd65ca1c8088.jpg":"chunks/08c9a8982ca48848e26724d8bed4bd65ca1c8088_DOwlwsn9.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/08ead11a10749522192edfda529798a21964e4b6.jpg":"chunks/08ead11a10749522192edfda529798a21964e4b6_B3916dX4.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/090157ba608a1af0cbf3e15fcf5a3564782ae289.jpg":"chunks/090157ba608a1af0cbf3e15fcf5a3564782ae289_Dpw4ht13.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/09721916acef024c52b6712fd305ba289b0e56d6.jpg":"chunks/09721916acef024c52b6712fd305ba289b0e56d6_D2UQxa9V.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/0979a7f5d0b107412e7dd263f3542437e9c0440b.jpg":"chunks/0979a7f5d0b107412e7dd263f3542437e9c0440b_DJ6njXVY.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/099e29fdafb774e5a065f1d7c111b9c89102dac2.jpg":"chunks/099e29fdafb774e5a065f1d7c111b9c89102dac2_D2p1Baj-.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/09cd945c039328e2529568084c2dc1f469fff274.jpg":"chunks/09cd945c039328e2529568084c2dc1f469fff274_CuJJuiiz.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/0a688a5641e458e43ae7e9241efacb2f0a569762.jpg":"chunks/0a688a5641e458e43ae7e9241efacb2f0a569762_CnKcbfMS.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/0b039a712f7b80bf0d6836090b1cd09baa929088.jpg":"chunks/0b039a712f7b80bf0d6836090b1cd09baa929088___hyVv_p.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/0b4695a9c75e7215591f80c115616f140378fc6e.jpg":"chunks/0b4695a9c75e7215591f80c115616f140378fc6e_CAsLAfJd.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/0b748f9285c6f3ecf7425f030057ee7a97802b79.jpg":"chunks/0b748f9285c6f3ecf7425f030057ee7a97802b79_DRubH7qy.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/0bc6417a6d469187ea7c910677e8ba7fc66afa25.jpg":"chunks/0bc6417a6d469187ea7c910677e8ba7fc66afa25_Cax8pONH.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/0bffc5378d05c9607cb0e323dfc65fb7072a5f1a.jpg":"chunks/0bffc5378d05c9607cb0e323dfc65fb7072a5f1a_BUfjZZDR.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/0c231d05946936f1bcd3246749c0276d9105210c.jpg":"chunks/0c231d05946936f1bcd3246749c0276d9105210c_BwypEvTG.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/0c6706f52f301eaaa027aac3dbb8bda512c72cff.jpg":"chunks/0c6706f52f301eaaa027aac3dbb8bda512c72cff_BcGXW8Dk.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/0c87fdb76e7f540a257e2fa6ac575acba2110ae7.jpg":"chunks/0c87fdb76e7f540a257e2fa6ac575acba2110ae7_CxXQKTVu.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/0d8377529dbf649c427417f5fa24e14c59fd4c84.jpg":"chunks/0d8377529dbf649c427417f5fa24e14c59fd4c84_BrdZbJ9o.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/0dd3be1d8bc6923f73d20e5c58a1330f0a46b525.jpg":"chunks/0dd3be1d8bc6923f73d20e5c58a1330f0a46b525_75Izbg_z.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/0e84659ad092a865fd341ed4447335af5ff98a62.jpg":"chunks/0e84659ad092a865fd341ed4447335af5ff98a62_D2qZ9jyX.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/0e8d92c0391e32232f09549c73f362737eacf30e.jpg":"chunks/0e8d92c0391e32232f09549c73f362737eacf30e_LVwIF0-8.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/0eb280cd6912bd22f1edd15e03bd47441a462051.jpg":"chunks/0eb280cd6912bd22f1edd15e03bd47441a462051_DIjp910T.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/0f2c990bbd527be8f06fe8f2e8c8e71ca3db545f.jpg":"chunks/0f2c990bbd527be8f06fe8f2e8c8e71ca3db545f_BpzowaMV.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/0f72d073457bade096cea7f713e958fd068e5387.jpg":"chunks/0f72d073457bade096cea7f713e958fd068e5387_B3hLENKd.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/0faba65ebe33d47f4705a320acc2df4fc088e1e7.jpg":"chunks/0faba65ebe33d47f4705a320acc2df4fc088e1e7_DVNaBnLp.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/0fd9e17cdf6562440d6b200ef9efb5b2ac6dfb2f.jpg":"chunks/0fd9e17cdf6562440d6b200ef9efb5b2ac6dfb2f_D0gC_uCj.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1002b3e369003f820e697e80e9df824372e954dc.jpg":"chunks/1002b3e369003f820e697e80e9df824372e954dc_D7L0qzQn.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/104b8bc35444bf07c4ed287eb51722dae8e65e09.jpg":"chunks/104b8bc35444bf07c4ed287eb51722dae8e65e09_BdUe8HVb.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/10555-bloomfield-street-toluca-lake-01.webp":"chunks/10555-bloomfield-street-toluca-lake-01_B1FbUb1Q.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/10555-bloomfield-street-toluca-lake-02.webp":"chunks/10555-bloomfield-street-toluca-lake-02_D8XRu7ny.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/10555-bloomfield-street-toluca-lake-03.webp":"chunks/10555-bloomfield-street-toluca-lake-03__DzmblwF.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/10555-bloomfield-street-toluca-lake-04.webp":"chunks/10555-bloomfield-street-toluca-lake-04_BVTdhZvf.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/10555-bloomfield-street-toluca-lake-05.webp":"chunks/10555-bloomfield-street-toluca-lake-05_D0P6om4n.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/10555-bloomfield-street-toluca-lake-06.webp":"chunks/10555-bloomfield-street-toluca-lake-06_BN1H2jEw.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/10555-bloomfield-street-toluca-lake-07.webp":"chunks/10555-bloomfield-street-toluca-lake-07_YzCDNju4.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/10555-bloomfield-street-toluca-lake-08.webp":"chunks/10555-bloomfield-street-toluca-lake-08_OPpV5LbL.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/10555-bloomfield-street-toluca-lake-09.webp":"chunks/10555-bloomfield-street-toluca-lake-09_CtS-FFpl.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/10912-west-blix-st-no-hollywood-01.webp":"chunks/10912-west-blix-st-no-hollywood-01_zhYb6B0f.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/10912-west-blix-st-no-hollywood-02.webp":"chunks/10912-west-blix-st-no-hollywood-02_CQ1wF4QM.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/10912-west-blix-st-no-hollywood-03.webp":"chunks/10912-west-blix-st-no-hollywood-03_FXWEvMIV.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/10912-west-blix-st-no-hollywood-04.webp":"chunks/10912-west-blix-st-no-hollywood-04_BoQJK2sX.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/10912-west-blix-st-no-hollywood-05.webp":"chunks/10912-west-blix-st-no-hollywood-05_6uuBS5ZD.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/10912-west-blix-st-no-hollywood-06.webp":"chunks/10912-west-blix-st-no-hollywood-06_DMLOp029.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/10c4bd06e792366699666aba2c3fb04bae124b3e.jpg":"chunks/10c4bd06e792366699666aba2c3fb04bae124b3e_DmDbbJN-.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/10d0da3fd596c7fe73f65924d0c6e5ae323eb992.jpg":"chunks/10d0da3fd596c7fe73f65924d0c6e5ae323eb992_D-bPtU0I.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1118d95f1957385e3810a1eaba4bb5bf29baa1e3.jpg":"chunks/1118d95f1957385e3810a1eaba4bb5bf29baa1e3_CK3esBKH.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1131d9757cd39aace83c4414c5dc0831c15b5eb8.jpg":"chunks/1131d9757cd39aace83c4414c5dc0831c15b5eb8_iwxfn1pY.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1138-wilshire-blvd-01.webp":"chunks/1138-wilshire-blvd-01_kQtkzOZ5.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1138-wilshire-blvd-02.webp":"chunks/1138-wilshire-blvd-02_VuAbGq4n.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1138-wilshire-blvd-03.webp":"chunks/1138-wilshire-blvd-03_c9kLL3Be.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1138-wilshire-blvd-04.webp":"chunks/1138-wilshire-blvd-04_dINiF8vK.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1138-wilshire-blvd-05.webp":"chunks/1138-wilshire-blvd-05_DAz7mk0u.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1138-wilshire-blvd-06.webp":"chunks/1138-wilshire-blvd-06_Dy3UepLp.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1138-wilshire-blvd-07.webp":"chunks/1138-wilshire-blvd-07_rdmSbslH.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1138-wilshire-blvd-08.webp":"chunks/1138-wilshire-blvd-08_Cd_VssHe.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1177d9df46de6c9f8a1d349177d8da715f4cb143.png":"chunks/1177d9df46de6c9f8a1d349177d8da715f4cb143_Bfg8zTsj.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/11be312dc569a0e4aa37b96dc43ddefb7160ee5e.jpg":"chunks/11be312dc569a0e4aa37b96dc43ddefb7160ee5e_C5UOawdJ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/11ccee4003455bf4fb521480a267a2931a68773d.jpg":"chunks/11ccee4003455bf4fb521480a267a2931a68773d_DEP9HTx4.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/12054dd4e67ac826560f922a82419dc54aec50f7.jpg":"chunks/12054dd4e67ac826560f922a82419dc54aec50f7_D_-tp-MZ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/12344d7e554717f5c55b46c75a0b3c8643ce997c.png":"chunks/12344d7e554717f5c55b46c75a0b3c8643ce997c_3Yp4yiDE.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/12ac7efc85d640f1ba8ae7d84f51930bec5712a4.png":"chunks/12ac7efc85d640f1ba8ae7d84f51930bec5712a4_DpdLTR03.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/12c396e1d3798a55964060c363405d9dbb3b49f6.jpg":"chunks/12c396e1d3798a55964060c363405d9dbb3b49f6_D-aMm-Rw.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1321-bates-ave-01.webp":"chunks/1321-bates-ave-01_Cm9M_BY8.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1321-bates-ave-02.webp":"chunks/1321-bates-ave-02_DMsgNIxm.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1321-bates-ave-03.webp":"chunks/1321-bates-ave-03_CLwD9_Ih.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1321-bates-ave-04.webp":"chunks/1321-bates-ave-04_NMSDoCK_.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1321-bates-ave-05.webp":"chunks/1321-bates-ave-05_Cnmgev-x.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1321-bates-ave-06.webp":"chunks/1321-bates-ave-06_CpEF_UH8.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1321-bates-ave-07.webp":"chunks/1321-bates-ave-07_BZ0Ar5i1.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1321-bates-ave-08.webp":"chunks/1321-bates-ave-08_BwLMksUC.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1321-bates-ave-09.webp":"chunks/1321-bates-ave-09_C03IZsZc.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1321-bates-ave-10.webp":"chunks/1321-bates-ave-10_Cl-ZipZm.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1321-bates-ave-11.webp":"chunks/1321-bates-ave-11_CNKj-1Zi.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1346-and-1332-north-fairfax-01.webp":"chunks/1346-and-1332-north-fairfax-01_VdXjGQKC.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1346-and-1332-north-fairfax-02.webp":"chunks/1346-and-1332-north-fairfax-02_CGYZEGKI.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1346-and-1332-north-fairfax-03.webp":"chunks/1346-and-1332-north-fairfax-03_DsV3pSwz.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1346-and-1332-north-fairfax-04.webp":"chunks/1346-and-1332-north-fairfax-04_BdYPtbRz.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1346-and-1332-north-fairfax-05.webp":"chunks/1346-and-1332-north-fairfax-05_maUFH5BC.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1346-and-1332-north-fairfax-06.webp":"chunks/1346-and-1332-north-fairfax-06_5_rc6N_G.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1346-and-1332-north-fairfax-07.webp":"chunks/1346-and-1332-north-fairfax-07_B2ilxq2y.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1346-and-1332-north-fairfax-08.webp":"chunks/1346-and-1332-north-fairfax-08_9o89Mwoi.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1346-and-1332-north-fairfax-09.webp":"chunks/1346-and-1332-north-fairfax-09_q_jfYdTU.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1346-and-1332-north-fairfax-10.webp":"chunks/1346-and-1332-north-fairfax-10_CEYoWwpd.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1346-and-1332-north-fairfax-11.webp":"chunks/1346-and-1332-north-fairfax-11_D2CLsoyM.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1346-and-1332-north-fairfax-12.webp":"chunks/1346-and-1332-north-fairfax-12_DP3R2u1d.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1346-and-1332-north-fairfax-13.webp":"chunks/1346-and-1332-north-fairfax-13_BK46iSlr.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1346-and-1332-north-fairfax-14.webp":"chunks/1346-and-1332-north-fairfax-14_Bxp0HAdy.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1346-and-1332-north-fairfax-15.webp":"chunks/1346-and-1332-north-fairfax-15_CQjPfZPq.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1346-and-1332-north-fairfax-16.webp":"chunks/1346-and-1332-north-fairfax-16_DWWZeT4E.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/13921-vanowen-st-van-nuys-01.webp":"chunks/13921-vanowen-st-van-nuys-01_DyfvjIZ_.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/13921-vanowen-st-van-nuys-02.webp":"chunks/13921-vanowen-st-van-nuys-02_CD3onY_E.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/13921-vanowen-st-van-nuys-03.webp":"chunks/13921-vanowen-st-van-nuys-03_DT1PX26x.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/13921-vanowen-st-van-nuys-04.webp":"chunks/13921-vanowen-st-van-nuys-04_ByjkvnQP.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/13921-vanowen-st-van-nuys-05.webp":"chunks/13921-vanowen-st-van-nuys-05_BsuFN7gB.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1412-n-mariposa-01.webp":"chunks/1412-n-mariposa-01_DGveqiT6.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1412-n-mariposa-02.webp":"chunks/1412-n-mariposa-02_STRdZ5X8.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1412-n-mariposa-03.webp":"chunks/1412-n-mariposa-03_C4xItN7t.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1412-n-mariposa-04.webp":"chunks/1412-n-mariposa-04_D0kkCayG.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1412-n-mariposa-05.webp":"chunks/1412-n-mariposa-05_2LfFXbaG.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1412-n-mariposa-06.webp":"chunks/1412-n-mariposa-06_tbl_v46W.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1412-n-mariposa-07.webp":"chunks/1412-n-mariposa-07_DJGIWgI9.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1412-n-mariposa-08.webp":"chunks/1412-n-mariposa-08_iyAnM4xB.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1412-n-mariposa-09.webp":"chunks/1412-n-mariposa-09_DgSnHDRR.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/14386b51021c7b08aba7c354f83e715d5a2ce038.jpg":"chunks/14386b51021c7b08aba7c354f83e715d5a2ce038_MSb2X-iz.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1449-51-echo-park-ave-01.webp":"chunks/1449-51-echo-park-ave-01_zOPfGU0J.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1449-51-echo-park-ave-02.webp":"chunks/1449-51-echo-park-ave-02_03EWvruY.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1449-51-echo-park-ave-03.webp":"chunks/1449-51-echo-park-ave-03_DTtuczmB.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1449-51-echo-park-ave-04.webp":"chunks/1449-51-echo-park-ave-04_BY5EpZxA.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1449-51-echo-park-ave-05.webp":"chunks/1449-51-echo-park-ave-05_BWZ3M-N2.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1449-51-echo-park-ave-06.webp":"chunks/1449-51-echo-park-ave-06_CmXI77-C.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1449-51-echo-park-ave-07.webp":"chunks/1449-51-echo-park-ave-07_BVjFfRzO.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1449-51-echo-park-ave-08.webp":"chunks/1449-51-echo-park-ave-08_Ba2wW4hQ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/149d763bb20a0305c49bc64586ad0cf27192c2a8.jpg":"chunks/149d763bb20a0305c49bc64586ad0cf27192c2a8_Ctdl7Vw4.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1517-23-w-8th-st-01.webp":"chunks/1517-23-w-8th-st-01_Dnh7lAjN.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1517-23-w-8th-st-02.webp":"chunks/1517-23-w-8th-st-02_DvPGbNnC.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1517-23-w-8th-st-03.webp":"chunks/1517-23-w-8th-st-03_CDf8qrF2.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1517-23-w-8th-st-04.webp":"chunks/1517-23-w-8th-st-04_CaHllTYg.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1517-23-w-8th-st-05.webp":"chunks/1517-23-w-8th-st-05_B8r-xXHX.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1529-n-winona-blvd-01.webp":"chunks/1529-n-winona-blvd-01_BKxwpf-7.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1529-n-winona-blvd-02.webp":"chunks/1529-n-winona-blvd-02_3M0ekJea.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1529-n-winona-blvd-03.webp":"chunks/1529-n-winona-blvd-03_4iw0XL1e.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1529-n-winona-blvd-04.webp":"chunks/1529-n-winona-blvd-04_C7k5GfJA.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1529-n-winona-blvd-05.webp":"chunks/1529-n-winona-blvd-05_BirzQfmX.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1529-n-winona-blvd-06.webp":"chunks/1529-n-winona-blvd-06_B4dmR9BU.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1529-n-winona-blvd-07.webp":"chunks/1529-n-winona-blvd-07_DxmVba0n.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1529-n-winona-blvd-08.webp":"chunks/1529-n-winona-blvd-08_Dd78DiXU.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1529-n-winona-blvd-09.webp":"chunks/1529-n-winona-blvd-09_CjCSHpyA.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1529-n-winona-blvd-10.webp":"chunks/1529-n-winona-blvd-10_sQo6ERgV.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1529-n-winona-blvd-11.webp":"chunks/1529-n-winona-blvd-11_BMUXWSj_.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1531-south-sawtelle-bundy-lock-and-key-01.webp":"chunks/1531-south-sawtelle-bundy-lock-and-key-01_DjwNMjv3.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1531-south-sawtelle-bundy-lock-and-key-02.webp":"chunks/1531-south-sawtelle-bundy-lock-and-key-02_Cjy5tswN.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1531-south-sawtelle-bundy-lock-and-key-03.webp":"chunks/1531-south-sawtelle-bundy-lock-and-key-03_Di0vIOEG.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1531-south-sawtelle-bundy-lock-and-key-04.webp":"chunks/1531-south-sawtelle-bundy-lock-and-key-04_DTce1gcB.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1531-south-sawtelle-bundy-lock-and-key-05.webp":"chunks/1531-south-sawtelle-bundy-lock-and-key-05_BkU4F6fV.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/153d65314ecfea0c4f39b8a7d499131839f2796b.jpg":"chunks/153d65314ecfea0c4f39b8a7d499131839f2796b_OQMUg7Kg.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1556d379e59848990696df5e9b48e8f0cd33aeb0.jpg":"chunks/1556d379e59848990696df5e9b48e8f0cd33aeb0_Mj5Kgiro.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1648be395384dd989323204e1fd86db332d6184d.png":"chunks/1648be395384dd989323204e1fd86db332d6184d_DXiUYb_J.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/17096e76fb5e8323de5fe1a346ec2316f9703afa.jpg":"chunks/17096e76fb5e8323de5fe1a346ec2316f9703afa_BNZkt-ft.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1723-n-wilcox-ave-01.webp":"chunks/1723-n-wilcox-ave-01_h3iQnk93.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1723-n-wilcox-ave-02.webp":"chunks/1723-n-wilcox-ave-02_CjYpWc-t.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1723-n-wilcox-ave-03.webp":"chunks/1723-n-wilcox-ave-03__438icvd.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1723-n-wilcox-ave-04.webp":"chunks/1723-n-wilcox-ave-04_CAYCAnPE.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1723-n-wilcox-ave-05.webp":"chunks/1723-n-wilcox-ave-05_DxBfZPWC.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1723-n-wilcox-ave-06.webp":"chunks/1723-n-wilcox-ave-06_DVzkDrK3.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1723-n-wilcox-ave-07.webp":"chunks/1723-n-wilcox-ave-07_DO4qxRJ-.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1723-n-wilcox-ave-08.webp":"chunks/1723-n-wilcox-ave-08_DcXEZEcE.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/172e5199bfd13e19215d5cc081765fedc7bbd67f.jpg":"chunks/172e5199bfd13e19215d5cc081765fedc7bbd67f_CHDEnOjk.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1773bb8cae20b3684c41aca5dc16280d87c39637.jpg":"chunks/1773bb8cae20b3684c41aca5dc16280d87c39637_CuEAIZpX.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1809-n-van-ness-01.webp":"chunks/1809-n-van-ness-01_THw59_RZ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1809-n-van-ness-02.webp":"chunks/1809-n-van-ness-02_CGZfk88X.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1809-n-van-ness-03.webp":"chunks/1809-n-van-ness-03_DWBgo7hW.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1809-n-van-ness-04.webp":"chunks/1809-n-van-ness-04_BC41LekA.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1809-n-van-ness-05.webp":"chunks/1809-n-van-ness-05_Be6l7I78.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1809-n-van-ness-06.webp":"chunks/1809-n-van-ness-06_Nl3pcShb.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1820-north-berendo-must-die-01.webp":"chunks/1820-north-berendo-must-die-01_DqeCUUh2.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1820-north-berendo-must-die-02.webp":"chunks/1820-north-berendo-must-die-02_CHmRfIRW.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1820-north-berendo-must-die-03.webp":"chunks/1820-north-berendo-must-die-03_Cc6UK_1w.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1820-north-berendo-must-die-04.webp":"chunks/1820-north-berendo-must-die-04_CG-h0RoH.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1820-north-berendo-must-die-05.webp":"chunks/1820-north-berendo-must-die-05_B4WEfsC_.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1820-north-berendo-must-die-06.webp":"chunks/1820-north-berendo-must-die-06_BFROQm3K.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1820-north-berendo-must-die-07.webp":"chunks/1820-north-berendo-must-die-07_BMrWsZUF.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/183b091d4c2cca34581587130161eb417e0198f8.jpg":"chunks/183b091d4c2cca34581587130161eb417e0198f8_D83NxcqA.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1844-n-alexandria-ave-01.webp":"chunks/1844-n-alexandria-ave-01_CP1__vp7.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1844-n-alexandria-ave-02.webp":"chunks/1844-n-alexandria-ave-02_Cu3z3DBX.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1844-n-alexandria-ave-03.webp":"chunks/1844-n-alexandria-ave-03_BFlkJmQL.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1844-n-alexandria-ave-04.webp":"chunks/1844-n-alexandria-ave-04_CzPU3mle.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1844-n-alexandria-ave-05.webp":"chunks/1844-n-alexandria-ave-05_BbqA67is.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1844-n-alexandria-ave-06.webp":"chunks/1844-n-alexandria-ave-06_Bh8AeyBj.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1844-n-alexandria-ave-07.webp":"chunks/1844-n-alexandria-ave-07_BgpiEUFu.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/18966dd72ae1a1960922b953ce306a3d85025728.jpg":"chunks/18966dd72ae1a1960922b953ce306a3d85025728_oHKwjxa4.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/18afe9cb18aafc17a48f447984d503deb970c6c4.jpg":"chunks/18afe9cb18aafc17a48f447984d503deb970c6c4_r5Ufb8s-.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/18b01e55205c82819988a145ecfdb682c386df7c.jpg":"chunks/18b01e55205c82819988a145ecfdb682c386df7c_CODSa-Jz.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1a00c1eec9a5addfe6e507625e1bbd80e76a5bf0.jpg":"chunks/1a00c1eec9a5addfe6e507625e1bbd80e76a5bf0_B4s5UezZ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1ab5c2ad766357870721c812adeb8325ea94a7ea.png":"chunks/1ab5c2ad766357870721c812adeb8325ea94a7ea_CmpFLeJw.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1acffdb878e599009c48a2a4a0375a05f11963c0.jpg":"chunks/1acffdb878e599009c48a2a4a0375a05f11963c0_C_Rm4rid.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1b07164a9360a002a4c6c0cb9d0286b749f33064.jpg":"chunks/1b07164a9360a002a4c6c0cb9d0286b749f33064_fe18FWYJ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1b255da3dc33dfb75baf0491e7b3883670277326.jpg":"chunks/1b255da3dc33dfb75baf0491e7b3883670277326_B1sAnOzk.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1c5c812662f4f9543093d4d84e63abd415bc0265.jpg":"chunks/1c5c812662f4f9543093d4d84e63abd415bc0265_CN96JaX1.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1ce14080dc00dbf1be380ea6afc08ec1ea9b836a.jpg":"chunks/1ce14080dc00dbf1be380ea6afc08ec1ea9b836a_C9pwfFzz.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1d4d79f6cb9610436e64c8079afa8c4ceadd7865.jpg":"chunks/1d4d79f6cb9610436e64c8079afa8c4ceadd7865_BMDADM8V.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1d81c2737ec6ccdd43c5ae43961b3b9cbde545ed.jpg":"chunks/1d81c2737ec6ccdd43c5ae43961b3b9cbde545ed_ol0PBltO.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1d8db4e53cc3de48ac32bd0715f90b7678a31f7a.jpg":"chunks/1d8db4e53cc3de48ac32bd0715f90b7678a31f7a_C4gbD2Jx.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1deeaaf61779c63f46c7e1d9423b8e7a3b69ed53.jpg":"chunks/1deeaaf61779c63f46c7e1d9423b8e7a3b69ed53_bRZbFaEk.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1e2ba3a77191407acf6ecccc068a506673ab60d8.png":"chunks/1e2ba3a77191407acf6ecccc068a506673ab60d8_Blwar2k_.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1f83c567c1844ed7d2ae0c16978d91d838fbf0d8.jpg":"chunks/1f83c567c1844ed7d2ae0c16978d91d838fbf0d8_Cv5tRinq.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1f85e290407f03a015f6edad1b8ac3999f8985d4.jpg":"chunks/1f85e290407f03a015f6edad1b8ac3999f8985d4_CTlBiYeJ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/1f975817b3aab6d31f82b16348d9f7144f57a552.jpg":"chunks/1f975817b3aab6d31f82b16348d9f7144f57a552_D0Ipd8Rw.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/2046f26ebea871b4a99892b7d9343294bb2ca236.jpg":"chunks/2046f26ebea871b4a99892b7d9343294bb2ca236_DleYd7S7.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/20650df94e068d32c8806feabf91c7c078e9711c.jpg":"chunks/20650df94e068d32c8806feabf91c7c078e9711c_DL9zvmgy.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/208-n-crescent-dr-beverly-hills-01.webp":"chunks/208-n-crescent-dr-beverly-hills-01_D6LTdCbq.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/208-n-crescent-dr-beverly-hills-02.webp":"chunks/208-n-crescent-dr-beverly-hills-02_DXY4K526.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/208-n-crescent-dr-beverly-hills-03.webp":"chunks/208-n-crescent-dr-beverly-hills-03_qog1I6vg.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/208-n-crescent-dr-beverly-hills-04.webp":"chunks/208-n-crescent-dr-beverly-hills-04_zZcuTji0.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/208-n-crescent-dr-beverly-hills-05.webp":"chunks/208-n-crescent-dr-beverly-hills-05_DUd4ahzx.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/208-n-crescent-dr-beverly-hills-06.webp":"chunks/208-n-crescent-dr-beverly-hills-06_CwEX9oTK.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/20e8a77d595533ae7ecebadbdfffcd3148a8b272.jpg":"chunks/20e8a77d595533ae7ecebadbdfffcd3148a8b272_9a8WTqvg.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/20ee7ad5aa85cf2c3f08ef47fb42a90ddde846ec.jpg":"chunks/20ee7ad5aa85cf2c3f08ef47fb42a90ddde846ec_BsekNVQ8.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/213401a617b0197fd6f3ec394961e4a389a79bc1.jpg":"chunks/213401a617b0197fd6f3ec394961e4a389a79bc1_BOiEIYJF.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/2160c6d9659193e8924026f9f0e6cd6650a575fd.jpg":"chunks/2160c6d9659193e8924026f9f0e6cd6650a575fd_DWpk8LR1.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/21bc20817846af625647a30521a2caef90667b69.jpg":"chunks/21bc20817846af625647a30521a2caef90667b69_BDrTxiIn.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/226-n-berendo-st-01.webp":"chunks/226-n-berendo-st-01_CBCFwNL_.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/226-n-berendo-st-02.webp":"chunks/226-n-berendo-st-02_CbMNdfNh.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/226-n-berendo-st-03.webp":"chunks/226-n-berendo-st-03_DSqGWlci.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/226-n-berendo-st-04.webp":"chunks/226-n-berendo-st-04_8Byo2NFM.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/226-n-berendo-st-05.webp":"chunks/226-n-berendo-st-05_bze9Ay0o.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/226-n-berendo-st-06.webp":"chunks/226-n-berendo-st-06_CDD7_xHv.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/226-n-berendo-st-07.webp":"chunks/226-n-berendo-st-07_Ciep4A7B.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/226-n-berendo-st-08.webp":"chunks/226-n-berendo-st-08_CgeAH5TJ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/226-n-berendo-st-09.webp":"chunks/226-n-berendo-st-09_ZZ0GNveT.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/226-n-berendo-st-10.webp":"chunks/226-n-berendo-st-10_BOhW8v91.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/226-n-berendo-st-11.webp":"chunks/226-n-berendo-st-11_CCcm4JR3.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/226-n-berendo-st-12.webp":"chunks/226-n-berendo-st-12_BpcuaAEI.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/226-n-berendo-st-13.webp":"chunks/226-n-berendo-st-13_BhogwOFD.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/226-n-berendo-st-14.webp":"chunks/226-n-berendo-st-14_D4IlW7NA.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/226-n-berendo-st-15.webp":"chunks/226-n-berendo-st-15_2oKIBeo1.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/22ca3dd15a6511b25a6a19e5859261fa08a0913c.jpg":"chunks/22ca3dd15a6511b25a6a19e5859261fa08a0913c_D-hxRIpT.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/230531246340eb995be56c69455c7afd2976d637.jpg":"chunks/230531246340eb995be56c69455c7afd2976d637_B7bWXHME.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/233c0bbff6b5c8fc1dec1de183e4fe35ce28fe67.png":"chunks/233c0bbff6b5c8fc1dec1de183e4fe35ce28fe67_BbOXmCl9.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/23a1f4b1c0fbca1e77e3c0c615294c85ae318110.jpg":"chunks/23a1f4b1c0fbca1e77e3c0c615294c85ae318110_DZy9BR9e.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/23c3396cdcd028fee9d2d993d731ac5ccb0de95c.jpg":"chunks/23c3396cdcd028fee9d2d993d731ac5ccb0de95c_DiWGDkSY.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/240e6949a489d70481cbcf97ed41a25a5ae38caf.jpg":"chunks/240e6949a489d70481cbcf97ed41a25a5ae38caf_BPxETO3j.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/24132b6359174d45395645ff934af993972f2ae4.jpg":"chunks/24132b6359174d45395645ff934af993972f2ae4_B6GWAmu1.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/2445e133273cb7280c33043b18867bb13a2bdd9c.jpg":"chunks/2445e133273cb7280c33043b18867bb13a2bdd9c_DVCsAFDE.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/247bdbb6e1e2a7ed82d9be2628114d4f4249295f.jpg":"chunks/247bdbb6e1e2a7ed82d9be2628114d4f4249295f_CmB4pkDF.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/2502eb0d9fe1e6cf6e5e9f23479d5c11bfa30193.jpg":"chunks/2502eb0d9fe1e6cf6e5e9f23479d5c11bfa30193_DktmfYSV.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/25a60fe490c824937bf6d80bd5a6457d4bac8d5f.jpg":"chunks/25a60fe490c824937bf6d80bd5a6457d4bac8d5f_DZ_e5PeK.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/25b2132a6573e4dcaa0260ecacd128d0e167ad49.jpg":"chunks/25b2132a6573e4dcaa0260ecacd128d0e167ad49_wUl-SoBM.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/25e03f72cc3adca025eafbd3df58b0195b3bb55e.png":"chunks/25e03f72cc3adca025eafbd3df58b0195b3bb55e_DYoky1z3.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/26058c89ada5881a3ce47ef2718e6ff9e299f768.jpg":"chunks/26058c89ada5881a3ce47ef2718e6ff9e299f768_CqYJLVgm.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/2656-s-magnolia-01.webp":"chunks/2656-s-magnolia-01_ClGnuhp5.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/2656-s-magnolia-02.webp":"chunks/2656-s-magnolia-02_DwCg6Sdm.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/2656-s-magnolia-03.webp":"chunks/2656-s-magnolia-03_BlmX644K.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/2656-s-magnolia-04.webp":"chunks/2656-s-magnolia-04_D9ePmjBn.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/2656-s-magnolia-05.webp":"chunks/2656-s-magnolia-05_BvNnTriW.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/2656-s-magnolia-06.webp":"chunks/2656-s-magnolia-06_4MO9J2y3.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/2656-s-magnolia-07.webp":"chunks/2656-s-magnolia-07_D2xg72uK.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/2656-s-magnolia-08.webp":"chunks/2656-s-magnolia-08_DkrQwaoD.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/2656-s-magnolia-09.webp":"chunks/2656-s-magnolia-09_C9sdtkQT.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/26cbc386def087f312ea756e9b2f7651c35cbcf9.jpg":"chunks/26cbc386def087f312ea756e9b2f7651c35cbcf9_BhRgPe49.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/2747fc6dbfa4a00968f6fbce6a3a333905f58be4.jpg":"chunks/2747fc6dbfa4a00968f6fbce6a3a333905f58be4_Dz-9z59Z.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/2785947ddf22e75568d12b88ce2c225549c412eb.jpg":"chunks/2785947ddf22e75568d12b88ce2c225549c412eb_BGzfdRRf.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/27ca527a496b8614985a750b3abdb46007cba17e.jpg":"chunks/27ca527a496b8614985a750b3abdb46007cba17e_D1cS63-i.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/2801713c988fd528334e7a0f406578a3869fc40b.jpg":"chunks/2801713c988fd528334e7a0f406578a3869fc40b_D2rqwm-O.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/286e2c0622f663444cdcde1d267b01f522b5f7f5.jpg":"chunks/286e2c0622f663444cdcde1d267b01f522b5f7f5_LMOCV-Ed.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/28cd02d8e08063c7b2af1b424310e9d05d617013.jpg":"chunks/28cd02d8e08063c7b2af1b424310e9d05d617013_CCVN4PVh.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/29e066a5ea0a88dc83ad23eaed1f17991714ff4d.jpg":"chunks/29e066a5ea0a88dc83ad23eaed1f17991714ff4d_9TA44usf.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/2a171e6d0352e552a06043d35565429d7192c847.jpg":"chunks/2a171e6d0352e552a06043d35565429d7192c847_Dx8RBCAR.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/2a35c26181ee2d029fad6db707de7e1b752f4111.jpg":"chunks/2a35c26181ee2d029fad6db707de7e1b752f4111_DKXJZynB.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/2a9e1a28addbed5dac8ac0c420f3b44eeb144edd.jpg":"chunks/2a9e1a28addbed5dac8ac0c420f3b44eeb144edd_Mdj0NJQV.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/2ada392d2f0a320aac41f641eb4b987e39962041.jpg":"chunks/2ada392d2f0a320aac41f641eb4b987e39962041_OU6Tv3-k.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/2b8cedd31f4f6dff158f3ac49e8a0da28e93abd8.jpg":"chunks/2b8cedd31f4f6dff158f3ac49e8a0da28e93abd8_DSJfLUDI.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/2c291e0aef0940e2cd8c411eb761f22a9cc04e1e.jpg":"chunks/2c291e0aef0940e2cd8c411eb761f22a9cc04e1e_Dr7c76ML.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/2c2d5c41ac355b4ed5d54f3b518de742a96ecb12.jpg":"chunks/2c2d5c41ac355b4ed5d54f3b518de742a96ecb12_D4x2ZdEU.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/2dcef3574d6d66d6c9f4cb94d7c984cc065a1cb1.jpg":"chunks/2dcef3574d6d66d6c9f4cb94d7c984cc065a1cb1_Bw50AaPo.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/2decd1409e025ea9df1a6a8041593a299660dd4e.jpg":"chunks/2decd1409e025ea9df1a6a8041593a299660dd4e_DLme6DFV.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/2df4692c8f2cf7504af283a524f3737c751ca112.png":"chunks/2df4692c8f2cf7504af283a524f3737c751ca112_DzUeh-CG.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/2e4c9b72940b681805c267d93cb82c4b1ad2fce6.png":"chunks/2e4c9b72940b681805c267d93cb82c4b1ad2fce6_DoPj19UN.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/2f9a6e7f47c8eab10351aa70090fad16e4af7fdf.jpg":"chunks/2f9a6e7f47c8eab10351aa70090fad16e4af7fdf_CoyxmcrG.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/2fce61d7ee199636bb1056807e9bba2cc3117556.jpg":"chunks/2fce61d7ee199636bb1056807e9bba2cc3117556_DTtb4Pxb.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/301d5949af0637273640efffbe5a8a17b2415662.jpg":"chunks/301d5949af0637273640efffbe5a8a17b2415662_2uLGDtlh.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/306862b90ae58398af71836ff67c5f8e95ae787c.jpg":"chunks/306862b90ae58398af71836ff67c5f8e95ae787c_DJOP2erX.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/308538130926ef8b8c5a5cbd5a28d3631b077aeb.jpg":"chunks/308538130926ef8b8c5a5cbd5a28d3631b077aeb_kbGDKIFo.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/310a90e422acf62723856f410ee92b7e3325c77c.jpg":"chunks/310a90e422acf62723856f410ee92b7e3325c77c_Dg0TI0AR.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3146c6cc1eeb234de6114ca7580bdb5c2be30e28.jpg":"chunks/3146c6cc1eeb234de6114ca7580bdb5c2be30e28_DODt_QoK.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/31e94959c6ebc3da2abbb3b2f498a7a34e034c6d.jpg":"chunks/31e94959c6ebc3da2abbb3b2f498a7a34e034c6d_BRGOOAJE.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/31f321e52d4a85b0afdaa88041224ccdf4f37d65.jpg":"chunks/31f321e52d4a85b0afdaa88041224ccdf4f37d65_BVSSAhvo.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3206bce10f1ee9dc42c43b7b880fed14e287b2f7.jpg":"chunks/3206bce10f1ee9dc42c43b7b880fed14e287b2f7_DAL4EJLF.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/326b27099e6a3e2a9dde48308a70fc2dd6192b3a.jpg":"chunks/326b27099e6a3e2a9dde48308a70fc2dd6192b3a_gjVoN51X.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/333ce80121aef514e5a9c92c636404a912ee4f40.jpg":"chunks/333ce80121aef514e5a9c92c636404a912ee4f40_Co0_kA64.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3421296dd6111bd99b1376e416a5667cc3dacac9.jpg":"chunks/3421296dd6111bd99b1376e416a5667cc3dacac9_CoM_K3lD.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/348906415217d4255b995bcb9e54d9c96c0d895c.png":"chunks/348906415217d4255b995bcb9e54d9c96c0d895c_jl7NkGbD.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/348ce9ef3ce8d9b2c36db2d57b80aa74bc58968a.jpg":"chunks/348ce9ef3ce8d9b2c36db2d57b80aa74bc58968a_BwqmloMa.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/34cf7d19901fef6c301446c47745de8ed4fa840f.png":"chunks/34cf7d19901fef6c301446c47745de8ed4fa840f_9UBMsegV.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3525-south-bronson-ave-01.webp":"chunks/3525-south-bronson-ave-01__ieXXhW2.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3525-south-bronson-ave-02.webp":"chunks/3525-south-bronson-ave-02_D2qhsbHy.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3525-south-bronson-ave-03.webp":"chunks/3525-south-bronson-ave-03_D-AkFa8F.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3525-south-bronson-ave-04.webp":"chunks/3525-south-bronson-ave-04_ci5hrI4s.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3525-south-bronson-ave-05.webp":"chunks/3525-south-bronson-ave-05_C3QQRGNi.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3525-south-bronson-ave-06.webp":"chunks/3525-south-bronson-ave-06_l5YNJOc2.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3525-south-bronson-ave-07.webp":"chunks/3525-south-bronson-ave-07_DP5R8nf5.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/354-north-avenue-53-01.webp":"chunks/354-north-avenue-53-01_CN8eLi5A.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/354-north-avenue-53-02.webp":"chunks/354-north-avenue-53-02_0mkufwlD.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/354-north-avenue-53-03.webp":"chunks/354-north-avenue-53-03_C0tRXrCm.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/354-north-avenue-53-04.webp":"chunks/354-north-avenue-53-04_BrUiwL1D.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/354-north-avenue-53-05.webp":"chunks/354-north-avenue-53-05_Cl7S7sqB.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/354-north-avenue-53-06.webp":"chunks/354-north-avenue-53-06_BbVWssLN.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/354-north-avenue-53-07.webp":"chunks/354-north-avenue-53-07_DYxNsv8o.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/354-north-avenue-53-08.webp":"chunks/354-north-avenue-53-08_CGI90UkK.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/354-north-avenue-53-09.webp":"chunks/354-north-avenue-53-09_DMQLXDLd.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/354-north-avenue-53-10.webp":"chunks/354-north-avenue-53-10_skqzEU_G.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/354-north-avenue-53-11.webp":"chunks/354-north-avenue-53-11_DVaV8FH1.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/354-north-avenue-53-12.webp":"chunks/354-north-avenue-53-12_hYCq-zL2.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/354-north-avenue-53-13.webp":"chunks/354-north-avenue-53-13_DpyDmAtR.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/354-north-avenue-53-14.webp":"chunks/354-north-avenue-53-14_ByWV9gxm.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/35556026ab54109ed477386c1b6db49df4e01503.jpg":"chunks/35556026ab54109ed477386c1b6db49df4e01503_CrD36uVr.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3593f811ebd4bf1828db47b83b6c696fc050b220.jpg":"chunks/3593f811ebd4bf1828db47b83b6c696fc050b220_H_-dd8J5.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/360973f7a002089c1a7badff5ebef5d5413daf5d.jpg":"chunks/360973f7a002089c1a7badff5ebef5d5413daf5d_BEpsX865.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/360a138b374d1f6a1a5a4a66bfc08b5d3ec90c33.png":"chunks/360a138b374d1f6a1a5a4a66bfc08b5d3ec90c33_B7_mNG0S.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/361-n-citrus-ave-01.webp":"chunks/361-n-citrus-ave-01_CMzNfumE.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/361-n-citrus-ave-02.webp":"chunks/361-n-citrus-ave-02_B9v0C_QW.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/361-n-citrus-ave-03.webp":"chunks/361-n-citrus-ave-03_rD4MQgPK.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/361-n-citrus-ave-04.webp":"chunks/361-n-citrus-ave-04_Bl02KOzE.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/361-n-citrus-ave-05.webp":"chunks/361-n-citrus-ave-05_BmAaH5YO.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/361-n-citrus-ave-06.webp":"chunks/361-n-citrus-ave-06_BNuUFshS.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/361-n-citrus-ave-07.webp":"chunks/361-n-citrus-ave-07_VkgnyMeG.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/361-n-citrus-ave-08.webp":"chunks/361-n-citrus-ave-08_CG_QzWeu.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/361-n-citrus-ave-09.webp":"chunks/361-n-citrus-ave-09_CMndGrBq.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/361-n-citrus-ave-10.webp":"chunks/361-n-citrus-ave-10_DMuDpwK2.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/361-n-citrus-ave-11.webp":"chunks/361-n-citrus-ave-11_B5onVgUs.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/361-n-citrus-ave-12.webp":"chunks/361-n-citrus-ave-12_DApzp7IC.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/361-n-citrus-ave-13.webp":"chunks/361-n-citrus-ave-13_WJPLJfvt.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/361-n-citrus-ave-14.webp":"chunks/361-n-citrus-ave-14_D77wnRiz.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/361-n-citrus-ave-15.webp":"chunks/361-n-citrus-ave-15_xDJjTAdu.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/361-n-citrus-ave-16.webp":"chunks/361-n-citrus-ave-16_CL2W8lxc.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/361-n-citrus-ave-17.webp":"chunks/361-n-citrus-ave-17_B2tdrRB2.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/361-n-citrus-ave-18.webp":"chunks/361-n-citrus-ave-18_Cx-W7D7N.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/361-n-citrus-ave-19.webp":"chunks/361-n-citrus-ave-19_IHCs_AsN.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/361-n-citrus-ave-20.webp":"chunks/361-n-citrus-ave-20_4ZwT9tLC.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/361-n-citrus-ave-21.webp":"chunks/361-n-citrus-ave-21_DdM0g_ma.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/361-n-citrus-ave-22.webp":"chunks/361-n-citrus-ave-22_DFEDcINA.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/361-n-citrus-ave-23.webp":"chunks/361-n-citrus-ave-23_B4R8vKaF.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/361-n-citrus-ave-24.webp":"chunks/361-n-citrus-ave-24_BS-8WVlW.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/361-n-citrus-ave-25.webp":"chunks/361-n-citrus-ave-25_CUCf8lYr.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/361-n-citrus-ave-26.webp":"chunks/361-n-citrus-ave-26_C6ONT8vI.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/361-n-citrus-ave-27.webp":"chunks/361-n-citrus-ave-27_-n942i8F.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/361-n-citrus-ave-28.webp":"chunks/361-n-citrus-ave-28_BFH335uY.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/361-n-citrus-ave-29.webp":"chunks/361-n-citrus-ave-29_4LOE-710.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/361-n-citrus-ave-30.webp":"chunks/361-n-citrus-ave-30_gWo9s8ld.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/361-n-citrus-ave-31.webp":"chunks/361-n-citrus-ave-31_CCfaMTt4.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/36b6099670d4f744107a3a8b65fde25ad0f71d5e.jpg":"chunks/36b6099670d4f744107a3a8b65fde25ad0f71d5e_Bl5YEWQS.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/36c9612e9a8f390f49ad7851b184f0c81585ced6.jpg":"chunks/36c9612e9a8f390f49ad7851b184f0c81585ced6_DcXgMUze.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/371-377-north-st-andrews-place-01.webp":"chunks/371-377-north-st-andrews-place-01_Bu2_iNeG.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/371-377-north-st-andrews-place-02.webp":"chunks/371-377-north-st-andrews-place-02_jyh3dcxy.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/371-377-north-st-andrews-place-03.webp":"chunks/371-377-north-st-andrews-place-03_D-cOuZjz.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/371-377-north-st-andrews-place-04.webp":"chunks/371-377-north-st-andrews-place-04_B7n-onoW.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/371-377-north-st-andrews-place-05.webp":"chunks/371-377-north-st-andrews-place-05_DT4wRBMr.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/371-377-north-st-andrews-place-06.webp":"chunks/371-377-north-st-andrews-place-06_BibXQg-S.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/371-377-north-st-andrews-place-07.webp":"chunks/371-377-north-st-andrews-place-07_j2gVF76-.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/371-377-north-st-andrews-place-08.webp":"chunks/371-377-north-st-andrews-place-08_Ck64U8Jd.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/371-377-north-st-andrews-place-09.webp":"chunks/371-377-north-st-andrews-place-09_B1rzFuU0.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/371-377-north-st-andrews-place-10.webp":"chunks/371-377-north-st-andrews-place-10_Co6pQUzo.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/373f828c8156572730fc2dc0c65d7e0d96c433d3.jpg":"chunks/373f828c8156572730fc2dc0c65d7e0d96c433d3_B3Xl_bCL.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3755-s-canfield-ave-palms-01.webp":"chunks/3755-s-canfield-ave-palms-01_Dz2LwCLT.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3755-s-canfield-ave-palms-02.webp":"chunks/3755-s-canfield-ave-palms-02_ClHCQ7TM.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3755-s-canfield-ave-palms-03.webp":"chunks/3755-s-canfield-ave-palms-03_Dq8_0_Ai.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/375c12d301af2e0e1207529958f91c9f929e4bb1.jpg":"chunks/375c12d301af2e0e1207529958f91c9f929e4bb1_A2L3zRW2.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/37a2e0ad978bfd58f95fda2a7171f7305d4e4563.jpg":"chunks/37a2e0ad978bfd58f95fda2a7171f7305d4e4563_BvcWZowG.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/383b20ff4c519ce07db2b8aa0e68da871140bc9d.jpg":"chunks/383b20ff4c519ce07db2b8aa0e68da871140bc9d_BBA1eA90.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3854484de44acecf08039794c52c86e1d120b553.jpg":"chunks/3854484de44acecf08039794c52c86e1d120b553_CLDVX3H7.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/38664400f28f01652fb710dfbc4c573f1fcc1a3b.jpg":"chunks/38664400f28f01652fb710dfbc4c573f1fcc1a3b_C1k3PsI8.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3926e9ab9dd55da1e8a6d37a5ddbb8e780290646.jpg":"chunks/3926e9ab9dd55da1e8a6d37a5ddbb8e780290646_BqX9-yLb.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3929ff4240094891cf7e05e41864a64c6458d645.jpg":"chunks/3929ff4240094891cf7e05e41864a64c6458d645_CP5pQ-tO.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3938560e6ceb11698e90ce9daab9302d827fddae.jpg":"chunks/3938560e6ceb11698e90ce9daab9302d827fddae_DVP6SGrK.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3967-beverly-and-friends-01.webp":"chunks/3967-beverly-and-friends-01_Cbd832Sr.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3967-beverly-and-friends-02.webp":"chunks/3967-beverly-and-friends-02_B_2J5-yQ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3967-beverly-and-friends-03.webp":"chunks/3967-beverly-and-friends-03_B9iAGErR.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3967-beverly-and-friends-04.webp":"chunks/3967-beverly-and-friends-04_DxFle2wB.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3967-beverly-and-friends-05.webp":"chunks/3967-beverly-and-friends-05_K6f14D2i.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3967-beverly-and-friends-06.webp":"chunks/3967-beverly-and-friends-06_B8caQcWA.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3967-beverly-and-friends-07.webp":"chunks/3967-beverly-and-friends-07_BiJCCiVV.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3967-beverly-and-friends-08.webp":"chunks/3967-beverly-and-friends-08_3tPRaZ6P.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3967-beverly-and-friends-09.webp":"chunks/3967-beverly-and-friends-09_MKXFui9y.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3967-beverly-and-friends-10.webp":"chunks/3967-beverly-and-friends-10_BVtO5STk.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3967-beverly-and-friends-11.webp":"chunks/3967-beverly-and-friends-11_BT0Nt1V6.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3967-beverly-and-friends-12.webp":"chunks/3967-beverly-and-friends-12_bN2T2Gh-.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3967-beverly-and-friends-13.webp":"chunks/3967-beverly-and-friends-13_Cc4xi0hb.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3967-beverly-and-friends-14.webp":"chunks/3967-beverly-and-friends-14_CdNjCtfM.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3967-beverly-and-friends-15.webp":"chunks/3967-beverly-and-friends-15_CZyRqKVj.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3967-beverly-and-friends-16.webp":"chunks/3967-beverly-and-friends-16_DiFQOWZc.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3967-beverly-and-friends-17.webp":"chunks/3967-beverly-and-friends-17_ykkfZmVs.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3967-beverly-and-friends-18.webp":"chunks/3967-beverly-and-friends-18_BaZ6tH8n.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3967-beverly-and-friends-19.webp":"chunks/3967-beverly-and-friends-19_S3Ofx5WU.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3967-beverly-and-friends-20.webp":"chunks/3967-beverly-and-friends-20_DPG8lVwB.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3967-beverly-and-friends-21.webp":"chunks/3967-beverly-and-friends-21_ByG98O8I.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3986fb6d421ca4d5212ac6774f15ef89e89e6102.jpg":"chunks/3986fb6d421ca4d5212ac6774f15ef89e89e6102_BbDp57D5.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3999f5feb974c940c7902d2953f6aec93ddaee33.jpg":"chunks/3999f5feb974c940c7902d2953f6aec93ddaee33_Dw8sgxUx.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/39afb494503c384e0ad751dc2a6cc91a2e336f64.jpg":"chunks/39afb494503c384e0ad751dc2a6cc91a2e336f64_gy1Zq2M_.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3a3370c3c02aa32a3aaa737382fe6968136e5c02.jpg":"chunks/3a3370c3c02aa32a3aaa737382fe6968136e5c02_CUbn5w8N.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3a526e3a1ed4c95d482bef94077f2395eb0af66e.jpg":"chunks/3a526e3a1ed4c95d482bef94077f2395eb0af66e_BdY1_DdA.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3ae6d7dd144c745985ade21bbc093c86969843be.jpg":"chunks/3ae6d7dd144c745985ade21bbc093c86969843be_DLBnZX3i.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3b77bb84937e0b8f7c6eb2f720320cd7c2e05ad9.jpg":"chunks/3b77bb84937e0b8f7c6eb2f720320cd7c2e05ad9_C_yeQZya.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3c306a30e1d15691f90dc2231c258997e3da41ac.jpg":"chunks/3c306a30e1d15691f90dc2231c258997e3da41ac_BZ0sQwY0.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3d59cb017c2fdd8637df5d16d50d9723f1aa1268.jpg":"chunks/3d59cb017c2fdd8637df5d16d50d9723f1aa1268_DjYy-pz6.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3d86d57ecda90ef56044398db09e618ec4fd89a5.jpg":"chunks/3d86d57ecda90ef56044398db09e618ec4fd89a5_BWtP5Sa9.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3ddc2d9d7f5eefaebe3232ddf61f3848138f1fb7.jpg":"chunks/3ddc2d9d7f5eefaebe3232ddf61f3848138f1fb7_X4rru6fw.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3f01e28ef30bad5271d2be38b129b2b005ea7774.jpg":"chunks/3f01e28ef30bad5271d2be38b129b2b005ea7774_DkmHMktS.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3f3955e591640ce1bb16c838209eb64cd5e9b889.jpg":"chunks/3f3955e591640ce1bb16c838209eb64cd5e9b889_CDbaD2a5.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3f5f21d3a1d7a82e046040ae24d53f4c83f09dfb.jpg":"chunks/3f5f21d3a1d7a82e046040ae24d53f4c83f09dfb_CzOplFdR.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3f6ba97ac996bd4762e9b453264267f9487ffc64.jpg":"chunks/3f6ba97ac996bd4762e9b453264267f9487ffc64_BWGqWBf0.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3f71e8edf2f6be4eb5bbcab6b86ab1c1fe06d744.jpg":"chunks/3f71e8edf2f6be4eb5bbcab6b86ab1c1fe06d744_ClGdu817.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3fb4dd1dfded7fde19325d40051d0043cd5374b8.jpg":"chunks/3fb4dd1dfded7fde19325d40051d0043cd5374b8_BGRVddmf.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/3fec1dfacdecfc8fa05c7a35cf447dd8b9c21518.jpg":"chunks/3fec1dfacdecfc8fa05c7a35cf447dd8b9c21518_DEHPB1lr.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/400cc671a54280e351bc554e8793ecbc1a6067a9.jpg":"chunks/400cc671a54280e351bc554e8793ecbc1a6067a9_CEbQJDcH.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4082ea68b138eb29b7397c0d91c4f32b2a2efea0.jpg":"chunks/4082ea68b138eb29b7397c0d91c4f32b2a2efea0_QWPhUea9.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/40be8217450cac7afee531d1a0e5e0f79f4ac13e.jpg":"chunks/40be8217450cac7afee531d1a0e5e0f79f4ac13e_pyPpUok8.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4111d2542dd7f9b37814e07d26608d59a2930d48.png":"chunks/4111d2542dd7f9b37814e07d26608d59a2930d48_D_4DSaMY.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/41385e9ccbd08d7ecfa807284c57ae110d87d976.jpg":"chunks/41385e9ccbd08d7ecfa807284c57ae110d87d976_DoCh_6mq.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/414e969bea5f4bb1e2e9d6502dc15edfb0f3016d.jpg":"chunks/414e969bea5f4bb1e2e9d6502dc15edfb0f3016d_DHmiYBCs.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/418cdc84a1341f9a18f52d6039d4507f5d4a8673.jpg":"chunks/418cdc84a1341f9a18f52d6039d4507f5d4a8673_7E2rvLSy.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/41dd2edb5c70f3686c58ee77fb586d0cb3a160e1.jpg":"chunks/41dd2edb5c70f3686c58ee77fb586d0cb3a160e1_-Lsozu1B.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4201-s-crenshaw-3600-w-stocker-01.webp":"chunks/4201-s-crenshaw-3600-w-stocker-01_ElrLjEh-.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4201-s-crenshaw-3600-w-stocker-02.webp":"chunks/4201-s-crenshaw-3600-w-stocker-02_CbIuCJUn.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4201-s-crenshaw-3600-w-stocker-03.webp":"chunks/4201-s-crenshaw-3600-w-stocker-03_DCDp8V7s.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4201-s-crenshaw-3600-w-stocker-04.webp":"chunks/4201-s-crenshaw-3600-w-stocker-04_B9p6r9LE.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4201-s-crenshaw-3600-w-stocker-05.webp":"chunks/4201-s-crenshaw-3600-w-stocker-05_UcYMbO5o.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4201-s-crenshaw-3600-w-stocker-06.webp":"chunks/4201-s-crenshaw-3600-w-stocker-06_CuDYerD7.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4201-s-crenshaw-3600-w-stocker-07.webp":"chunks/4201-s-crenshaw-3600-w-stocker-07_CYEX2PDp.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4201-s-crenshaw-3600-w-stocker-08.webp":"chunks/4201-s-crenshaw-3600-w-stocker-08_CghDVPgG.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4201-s-crenshaw-3600-w-stocker-09.webp":"chunks/4201-s-crenshaw-3600-w-stocker-09_CMRYkjy3.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4201-s-crenshaw-3600-w-stocker-10.webp":"chunks/4201-s-crenshaw-3600-w-stocker-10_Durx4sBg.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4201-s-crenshaw-3600-w-stocker-11.webp":"chunks/4201-s-crenshaw-3600-w-stocker-11_DeKJvE_k.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4201-s-crenshaw-3600-w-stocker-12.webp":"chunks/4201-s-crenshaw-3600-w-stocker-12_Cb83dr27.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4201-s-crenshaw-3600-w-stocker-13.webp":"chunks/4201-s-crenshaw-3600-w-stocker-13_BDices1x.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4208f6eb05700578ad62ad168eddbd1fe6d78eb4.jpg":"chunks/4208f6eb05700578ad62ad168eddbd1fe6d78eb4_CI7f0GDC.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4360843ba6e50d78ff6c1dfa7aa3f79c80e20960.jpg":"chunks/4360843ba6e50d78ff6c1dfa7aa3f79c80e20960_Mmfp1xAL.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/439d7a74cc2b1a8a00006fefa0f96dcd8710dd68.jpg":"chunks/439d7a74cc2b1a8a00006fefa0f96dcd8710dd68_Cs9uBBlV.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/43fd03ddaaa62cc880aa64c6723b660d9c3ec161.png":"chunks/43fd03ddaaa62cc880aa64c6723b660d9c3ec161_BtivWzfd.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/44215866c8e59aad27ce74409a781216e7c17eea.jpg":"chunks/44215866c8e59aad27ce74409a781216e7c17eea_D9VJsD9g.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/44459f71b9b783bcbf818752adf6dcc037985b36.jpg":"chunks/44459f71b9b783bcbf818752adf6dcc037985b36_CuS_CIOm.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/444fd89b2596d481a052bde1c837152091348228.jpg":"chunks/444fd89b2596d481a052bde1c837152091348228_BF4ZCpiZ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4459bb0f1b1cd755d175ec1a99872c2b280569a6.jpg":"chunks/4459bb0f1b1cd755d175ec1a99872c2b280569a6_oRTF2Kz9.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/44e28cfb46a3fb73cedd66059281b895c1b043ce.jpg":"chunks/44e28cfb46a3fb73cedd66059281b895c1b043ce_BjJ0w-A2.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/451fff059381f12d422a9b26d2c2291d2762565b.jpg":"chunks/451fff059381f12d422a9b26d2c2291d2762565b_C3pdvNh6.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4544-los-feliz-blvd-01.webp":"chunks/4544-los-feliz-blvd-01_C7DunlFQ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4544-los-feliz-blvd-02.webp":"chunks/4544-los-feliz-blvd-02_D5N1xs62.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4544-los-feliz-blvd-03.webp":"chunks/4544-los-feliz-blvd-03_Cwj7Rl6O.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4544-los-feliz-blvd-04.webp":"chunks/4544-los-feliz-blvd-04_DxaHbmuj.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4544-los-feliz-blvd-05.webp":"chunks/4544-los-feliz-blvd-05_Yh1E9V7T.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4544-los-feliz-blvd-06.webp":"chunks/4544-los-feliz-blvd-06_CEJLacHJ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4544-los-feliz-blvd-07.webp":"chunks/4544-los-feliz-blvd-07_Ds924u_Y.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4544-los-feliz-blvd-08.webp":"chunks/4544-los-feliz-blvd-08_D83_eEpo.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4544-los-feliz-blvd-09.webp":"chunks/4544-los-feliz-blvd-09_BSdBojU6.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4544-los-feliz-blvd-10.webp":"chunks/4544-los-feliz-blvd-10_jw_PKN4K.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4544-los-feliz-blvd-11.webp":"chunks/4544-los-feliz-blvd-11_DfxKMdbr.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4544-los-feliz-blvd-12.webp":"chunks/4544-los-feliz-blvd-12_B3mL0PKY.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4544-los-feliz-blvd-13.webp":"chunks/4544-los-feliz-blvd-13_BX7W7hZZ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4544-los-feliz-blvd-14.webp":"chunks/4544-los-feliz-blvd-14_D6rl5AmF.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4544-los-feliz-blvd-15.webp":"chunks/4544-los-feliz-blvd-15_BdZOAFjV.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4544-los-feliz-blvd-16.webp":"chunks/4544-los-feliz-blvd-16_B5mAtANv.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4544-los-feliz-blvd-17.webp":"chunks/4544-los-feliz-blvd-17_BEYOQJ0T.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/45837a6b782488296a883eee774ccc6f4f61a844.jpg":"chunks/45837a6b782488296a883eee774ccc6f4f61a844_C7KEtAiU.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4629-4651-w-maubert-ave-01.webp":"chunks/4629-4651-w-maubert-ave-01_DIR7dElU.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4629-4651-w-maubert-ave-02.webp":"chunks/4629-4651-w-maubert-ave-02_cLnX-pmu.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4629-4651-w-maubert-ave-03.webp":"chunks/4629-4651-w-maubert-ave-03_C1Dm7E_7.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4629-4651-w-maubert-ave-04.webp":"chunks/4629-4651-w-maubert-ave-04_CX7wjss9.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4629-4651-w-maubert-ave-05.webp":"chunks/4629-4651-w-maubert-ave-05_-91gV_Gp.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4629-4651-w-maubert-ave-06.webp":"chunks/4629-4651-w-maubert-ave-06_CP3V_26A.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4629-4651-w-maubert-ave-07.webp":"chunks/4629-4651-w-maubert-ave-07_B_jlQGIi.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4629-4651-w-maubert-ave-08.webp":"chunks/4629-4651-w-maubert-ave-08_DVtwpce_.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4629-4651-w-maubert-ave-09.webp":"chunks/4629-4651-w-maubert-ave-09_Bb-QqINp.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/462a1df312a402cacbb5eecc9216234d6ef038a6.jpg":"chunks/462a1df312a402cacbb5eecc9216234d6ef038a6_DjNhr5TN.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/484ccc5aa08d907b96e98d58aea3f67485542582.jpg":"chunks/484ccc5aa08d907b96e98d58aea3f67485542582_CE8w8H5A.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/486d7caf369fbc903cae371956b5671b1603869e.jpg":"chunks/486d7caf369fbc903cae371956b5671b1603869e_DuoaTv-t.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/488033aab876a88e930eb7a794f4b7ec288d0901.jpg":"chunks/488033aab876a88e930eb7a794f4b7ec288d0901_Cg_hhW5G.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/48d4f1c3623f44176387468a6678f20968cdadb1.jpg":"chunks/48d4f1c3623f44176387468a6678f20968cdadb1_yj-hkzMF.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/48f0cfc72708226343bd158bceec4bee54854fb8.jpg":"chunks/48f0cfc72708226343bd158bceec4bee54854fb8_BSgMnpQY.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4926b4edf633a56976b11dd4d08668f83b187b19.jpg":"chunks/4926b4edf633a56976b11dd4d08668f83b187b19_BrfkzDka.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4954ee905de6174fc9a35a958164152b99ef4fa6.jpg":"chunks/4954ee905de6174fc9a35a958164152b99ef4fa6_JVX0i04U.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/49c4b321503e6b66930b8198e0fc69008dbd2526.jpg":"chunks/49c4b321503e6b66930b8198e0fc69008dbd2526_taDxvL3q.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4a2f96aeecfe6efe36607b87dcd06bb138a3dabf.jpg":"chunks/4a2f96aeecfe6efe36607b87dcd06bb138a3dabf_CtDgMKad.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4a301cde81fc5ebe8b1a1a1c44ba27116108c92a.jpg":"chunks/4a301cde81fc5ebe8b1a1a1c44ba27116108c92a_v-TpRe6L.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4a74cd56b53964caaeab2a135c15b97506a48ea5.jpg":"chunks/4a74cd56b53964caaeab2a135c15b97506a48ea5_hHARusgW.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4a7c28ba1b6fec10e5bcd2c15012d11ed7a77118.jpg":"chunks/4a7c28ba1b6fec10e5bcd2c15012d11ed7a77118_pWdJmkZ1.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4ae54f451a71d7ce4c95b1bdf49309775a507616.jpg":"chunks/4ae54f451a71d7ce4c95b1bdf49309775a507616_CGMA45HW.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4aec3d5de760392dfb2149f3e5e3e58ff6b0bf15.jpg":"chunks/4aec3d5de760392dfb2149f3e5e3e58ff6b0bf15_CCdl9ehN.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4b0113931b283e6bf3a647b39c19cedde11e7ccc.jpg":"chunks/4b0113931b283e6bf3a647b39c19cedde11e7ccc_C-R7TSE3.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4b6da98d0791cd79c5afb91cf7aa9c3abd2e1026.jpg":"chunks/4b6da98d0791cd79c5afb91cf7aa9c3abd2e1026_fZU5sWcu.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4b75cb3d77ab657e50e2325b29d5a014a00f2418.jpg":"chunks/4b75cb3d77ab657e50e2325b29d5a014a00f2418_DIj7bkrY.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4b99d1da59036005a531a5c743848966f3f085d8.jpg":"chunks/4b99d1da59036005a531a5c743848966f3f085d8_DVYUxiHY.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4c3bbe5879af069e2826400cba6f8c38123465d9.jpg":"chunks/4c3bbe5879af069e2826400cba6f8c38123465d9_DlI9RWGQ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4c928abb0730e0592f10e5ed85d8942a459b6e58.png":"chunks/4c928abb0730e0592f10e5ed85d8942a459b6e58_BA3QgpHm.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4cad8119cfbc63dae6772f3e064dd8e85047d018.jpg":"chunks/4cad8119cfbc63dae6772f3e064dd8e85047d018_CT7pHMwA.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4cc3cdc6571a43af17be01331cf80135c4691959.jpg":"chunks/4cc3cdc6571a43af17be01331cf80135c4691959_C3MaKQ78.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4da550f3c078f5373112b2c72dd9cbaba5a419e2.jpg":"chunks/4da550f3c078f5373112b2c72dd9cbaba5a419e2_3HN5KW9A.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4e11973009ef84cf86204b9f66ed15678f5acd96.jpg":"chunks/4e11973009ef84cf86204b9f66ed15678f5acd96_1Mf8IpSO.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4e55b1b788993e89b51c9ba9edeaa9e8fa79906b.jpg":"chunks/4e55b1b788993e89b51c9ba9edeaa9e8fa79906b_BWWCwrz6.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4f20ab9764732099677f964040a5226718f0925c.jpg":"chunks/4f20ab9764732099677f964040a5226718f0925c_DWyhJZFO.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4f2bf90bb8a62f4296018b912198f9a608dc871a.jpg":"chunks/4f2bf90bb8a62f4296018b912198f9a608dc871a_DoDbcQpB.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4f696ab0ec7e99108fea25bf3010ffff80f160a3.jpg":"chunks/4f696ab0ec7e99108fea25bf3010ffff80f160a3_BW3Nszgg.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4fcee216ffcc8cedecfb27b09c739b4f75076509.jpg":"chunks/4fcee216ffcc8cedecfb27b09c739b4f75076509_B_iqks2X.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/4fe292862704dd364371241d8a7d261d27cb840f.jpg":"chunks/4fe292862704dd364371241d8a7d261d27cb840f_BBPWKV80.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/5012f6783b31617675656473a4d1f44a40e858af.jpg":"chunks/5012f6783b31617675656473a4d1f44a40e858af_BTYPx5lg.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/505bb90ac0262de5bff3a50ee727998d00265aeb.jpg":"chunks/505bb90ac0262de5bff3a50ee727998d00265aeb_owo5e1fP.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/50931bef15f3ba736931bcc349f05c2bf4b79000.jpg":"chunks/50931bef15f3ba736931bcc349f05c2bf4b79000_Cl2BGukd.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/50933581902fcdf860d117f1fcd9cb59870bf39c.jpg":"chunks/50933581902fcdf860d117f1fcd9cb59870bf39c_D-wKak8v.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/518264f79e083126af55204c6d7dec89e202af30.jpg":"chunks/518264f79e083126af55204c6d7dec89e202af30_Dcl858Pk.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/5201d922d12b00224f139f4e0a29d22099ec6655.jpg":"chunks/5201d922d12b00224f139f4e0a29d22099ec6655_BxwLz0Py.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/52473c3faf562f02d4002b09ee291a999e861125.jpg":"chunks/52473c3faf562f02d4002b09ee291a999e861125_CqLjBQ6A.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/52c1b0fbcb86ea9d40c62042ed419687c8b451e8.jpg":"chunks/52c1b0fbcb86ea9d40c62042ed419687c8b451e8_DrhUdETt.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/530e6f40feffe0ce84f37389445702aac59706bb.jpg":"chunks/530e6f40feffe0ce84f37389445702aac59706bb_BfwX2uac.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/532f9126666f44ec0bbaee4aac9cbca3d4541af4.jpg":"chunks/532f9126666f44ec0bbaee4aac9cbca3d4541af4_BpKOlXVX.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/536dd03e98bfeb51b7e41269a102afc4eec1223a.jpg":"chunks/536dd03e98bfeb51b7e41269a102afc4eec1223a_CwvLuSb3.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/538b6804f5869ce30c2419a4943dbc8c7435c098.jpg":"chunks/538b6804f5869ce30c2419a4943dbc8c7435c098_BMdC2pw9.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/538bd0a025fa39d8d56aa5c2e247a3bec7029757.jpg":"chunks/538bd0a025fa39d8d56aa5c2e247a3bec7029757_BXgXshCO.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/53ac5a92bff89595a1cbd98ff76afca197e32a6b.jpg":"chunks/53ac5a92bff89595a1cbd98ff76afca197e32a6b_Br3vREAA.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/53d207a3b55f4141547d38d5920ada915f6459e8.jpg":"chunks/53d207a3b55f4141547d38d5920ada915f6459e8_DKsjK7du.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/54d4bc9dc4c2d118146cf441a0a03545993513a1.jpg":"chunks/54d4bc9dc4c2d118146cf441a0a03545993513a1_CC-YVXsP.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/5584c0f7d91830bb5c174e6799c1644cb257e386.jpg":"chunks/5584c0f7d91830bb5c174e6799c1644cb257e386_DGUxhnq1.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/55ef97295187132a98a134f01b070b3f31442a54.jpg":"chunks/55ef97295187132a98a134f01b070b3f31442a54_CDqvzI83.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/561251beef0440ce75712ae522e8961ee51505d1.jpg":"chunks/561251beef0440ce75712ae522e8961ee51505d1_Dss5EdQf.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/567bd8b3814a8f6fea81e57aa2e6dd83f9a97c96.jpg":"chunks/567bd8b3814a8f6fea81e57aa2e6dd83f9a97c96_oyHnQ2xz.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/56a6b684fda56e1557132616a04b82c3ad4813ae.jpg":"chunks/56a6b684fda56e1557132616a04b82c3ad4813ae_B2MgWqrM.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/573ef03cfce70d47e3509e6b814009e305989525.jpg":"chunks/573ef03cfce70d47e3509e6b814009e305989525_CPp_Lh4C.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/5750aa5d4e6a309adefb34cb76292923bb5ac326.jpg":"chunks/5750aa5d4e6a309adefb34cb76292923bb5ac326_BeUoZ-GV.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/575a5060d3c57aa2b30a2e8c2c998bdaac23f28b.jpg":"chunks/575a5060d3c57aa2b30a2e8c2c998bdaac23f28b_CXN8s4CJ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/5760c27df6a38c4e81cf1d456e4773d87b3c2d29.jpg":"chunks/5760c27df6a38c4e81cf1d456e4773d87b3c2d29_Bxy6E4by.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/57649e4521b5434044c245e39826c216c2ff68ed.jpg":"chunks/57649e4521b5434044c245e39826c216c2ff68ed_BR8N55iA.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/5765f63f65718a148f71ff42702bc032be82bd06.jpg":"chunks/5765f63f65718a148f71ff42702bc032be82bd06_CNi1ciSX.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/577c824625932961663503cac4faea9bc1a3dca5.jpg":"chunks/577c824625932961663503cac4faea9bc1a3dca5_DTCeIoBD.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/57a9201542d9e7094735cb821ad11446ead4b86e.jpg":"chunks/57a9201542d9e7094735cb821ad11446ead4b86e_CgnZWWu2.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/57fa864962dcd3471ec2aaff364780f21329558d.jpg":"chunks/57fa864962dcd3471ec2aaff364780f21329558d_EUHCh4WQ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/581978db08bae445de5fe60f0831c15b65fc976d.jpg":"chunks/581978db08bae445de5fe60f0831c15b65fc976d_BDjbwLzG.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/59412de0a996fa3bd379e56582b8a9d3d503190d.jpg":"chunks/59412de0a996fa3bd379e56582b8a9d3d503190d_D9Ad6r-o.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/594ff909484cb3705999c5426d1ce25dc2d0abed.jpg":"chunks/594ff909484cb3705999c5426d1ce25dc2d0abed_Dr7WPnt6.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/59fca437c14406ae830bbf6ff883cbf221d20753.jpg":"chunks/59fca437c14406ae830bbf6ff883cbf221d20753_Cdj1yQBW.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/5a104c32c0426444232fac3727b084d3a22b8059.jpg":"chunks/5a104c32c0426444232fac3727b084d3a22b8059_B3lGB2pb.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/5aba9fea86996f63debab4a313aaddd02f885070.jpg":"chunks/5aba9fea86996f63debab4a313aaddd02f885070_BPbEM0yE.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/5b2152d02d767b2d134719850f3e84f785a1c7e0.jpg":"chunks/5b2152d02d767b2d134719850f3e84f785a1c7e0_DJ2tR9TI.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/5bc81d87e97e8ef3764fdb599d639a089d190439.jpg":"chunks/5bc81d87e97e8ef3764fdb599d639a089d190439_VrgEyzrf.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/5c675adfdda4f7a3b4645dcf34dbc3fcf0772676.jpg":"chunks/5c675adfdda4f7a3b4645dcf34dbc3fcf0772676_DJjkL8ex.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/5c9c56aed69ab469cc1c482ca373f678ad20d47c.jpg":"chunks/5c9c56aed69ab469cc1c482ca373f678ad20d47c_BhIJcMxV.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/5ce19dbb84650bbddb6fdcbea7eeaebfab94877f.png":"chunks/5ce19dbb84650bbddb6fdcbea7eeaebfab94877f_C6b0Rp6N.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/5cf9d8e52ac5802cb5c0fd2820aeac5bf25a1e28.jpg":"chunks/5cf9d8e52ac5802cb5c0fd2820aeac5bf25a1e28_B_5KY3ne.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/5d1496c54caf90b4354c4526929ddb25fa4bf7f6.jpg":"chunks/5d1496c54caf90b4354c4526929ddb25fa4bf7f6_DpRKi961.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/5d3131879fdf30074cc3f3fa9854564be7c71902.png":"chunks/5d3131879fdf30074cc3f3fa9854564be7c71902_CG53x1Hn.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/5d9ea80188d6769eec3ee961aba76ab4dc61331e.png":"chunks/5d9ea80188d6769eec3ee961aba76ab4dc61331e_BNG1-msc.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/5dc80fa61ffea96ac1c2e154432aee8419593ef2.jpg":"chunks/5dc80fa61ffea96ac1c2e154432aee8419593ef2_Cq6CuAL6.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/5e7bde9182e2b6b8ad0a012984ebc50b00cb32c2.jpg":"chunks/5e7bde9182e2b6b8ad0a012984ebc50b00cb32c2_DjxEGHsN.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/5ee1a43e3b595562ff9fad11158a7b51c1a8b224.jpg":"chunks/5ee1a43e3b595562ff9fad11158a7b51c1a8b224_Cxk0Irew.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/5f112bfc91e716d7b8237b985d2ce7c25b6054ed.jpg":"chunks/5f112bfc91e716d7b8237b985d2ce7c25b6054ed_y7Jv6ITO.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/5f286255883db528620fb33d5d58cf014ba16116.jpg":"chunks/5f286255883db528620fb33d5d58cf014ba16116_Ssu3hCf4.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/6035301a83fe22aff666605b2e02f49cd6d68514.jpg":"chunks/6035301a83fe22aff666605b2e02f49cd6d68514_OmGttnvG.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/609d96b8ce578c30036c9b4a3543b5d58cda2561.png":"chunks/609d96b8ce578c30036c9b4a3543b5d58cda2561_BVBpL8hy.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/60de06bd5f70d312ac01fe8786d24a6351342229.jpg":"chunks/60de06bd5f70d312ac01fe8786d24a6351342229_BCVTCTK_.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/616a00ec32573bc88b734e7f3ddec47ed85bde08.jpg":"chunks/616a00ec32573bc88b734e7f3ddec47ed85bde08_BF3ItByE.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/6242dc65ec3c174cb2d3abc2f12cc4ab4c9f87f4.jpg":"chunks/6242dc65ec3c174cb2d3abc2f12cc4ab4c9f87f4_5WWBL62d.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/62a04704c234b006c3617a2453035ae20427b28a.jpg":"chunks/62a04704c234b006c3617a2453035ae20427b28a_CD_dcFtW.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/6306b31da01aa9599f8888d8b70134d29ad0f0a5.jpg":"chunks/6306b31da01aa9599f8888d8b70134d29ad0f0a5_Bg66AQKr.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/63677d1217256c1ffb1467dc5f0254cf2ec292bc.jpg":"chunks/63677d1217256c1ffb1467dc5f0254cf2ec292bc_3DrL0vek.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/644b7d8f301b8525548650f00b3598227a67b048.jpg":"chunks/644b7d8f301b8525548650f00b3598227a67b048_IiRmNwKl.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/645e86aec38355a1dced110c9d8068c2fccb6ce1.jpg":"chunks/645e86aec38355a1dced110c9d8068c2fccb6ce1_CX5vXvYW.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/64b2cee1ca4c8044325dc36d167f53fc0d4459f0.png":"chunks/64b2cee1ca4c8044325dc36d167f53fc0d4459f0_M1j-Szc_.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/651b66d936d1f59920a94edd5f7281e23ea7a17b.jpg":"chunks/651b66d936d1f59920a94edd5f7281e23ea7a17b_CXYtuEqc.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/656cd6832ec1ad4ac0d4054830d63646e9059d7f.jpg":"chunks/656cd6832ec1ad4ac0d4054830d63646e9059d7f_D36GRgca.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/657d204a215d59f3443c944b417a62115f5407af.jpg":"chunks/657d204a215d59f3443c944b417a62115f5407af_DeP_Rwkc.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/66898ffa77e75405873f1894a7eb01ca8fe9aa70.jpg":"chunks/66898ffa77e75405873f1894a7eb01ca8fe9aa70_BdmcCcWG.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/669612a73949304ce998cca15a148d1e8257e54c.jpg":"chunks/669612a73949304ce998cca15a148d1e8257e54c_CrvULrGw.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/670b2603ae4e5cce468840f0b8bfb15a6eab02ad.jpg":"chunks/670b2603ae4e5cce468840f0b8bfb15a6eab02ad_smnocO09.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/673b068779c0540708e989db66b5cf1ff09cba49.jpg":"chunks/673b068779c0540708e989db66b5cf1ff09cba49_BW9pUHdm.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/673b53f245ae2e167b31a3521ada19d0e68d0b5d.jpg":"chunks/673b53f245ae2e167b31a3521ada19d0e68d0b5d_DWjDJXTN.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/6746c4f1cd0c68b119fcec71999f9674f5dbda3b.jpg":"chunks/6746c4f1cd0c68b119fcec71999f9674f5dbda3b_BmvgeVFC.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/678d76193a182514d2fe0db2eff2fffdbd0a5509.jpg":"chunks/678d76193a182514d2fe0db2eff2fffdbd0a5509_Cjzu3Ajr.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/67e387437a1a302f5f148af16f2378347f48cf5b.jpg":"chunks/67e387437a1a302f5f148af16f2378347f48cf5b_CB1tsdik.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/6833f19137db4c5376110d6d19bceb9e29d1b915.jpg":"chunks/6833f19137db4c5376110d6d19bceb9e29d1b915_Cvr1xcsU.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/68a0085a4fcf8a57a637d7551441127537b22750.jpg":"chunks/68a0085a4fcf8a57a637d7551441127537b22750_DizmjoAa.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/68ed41bbbb26542c4033d13cb3b8bbdfc041445e.jpg":"chunks/68ed41bbbb26542c4033d13cb3b8bbdfc041445e_DRd5f-HF.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/6979852423df123758be7a511bd80e0767944ef9.jpg":"chunks/6979852423df123758be7a511bd80e0767944ef9_BBlxe4XZ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/69c90c12fcba4c93ee5446bc4722010673cae384.jpg":"chunks/69c90c12fcba4c93ee5446bc4722010673cae384_Bm1WZiQc.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/6a81aba31cfdeedfe0ece088d9f20a2db6f2762a.jpg":"chunks/6a81aba31cfdeedfe0ece088d9f20a2db6f2762a_BywePe9I.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/6d2d1f10505361bb3aa1935f29ef15555db509da.jpg":"chunks/6d2d1f10505361bb3aa1935f29ef15555db509da_D71E-Tdw.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/6dc53ae2b0ca2b9e59978875a3d66743306ddf3b.jpg":"chunks/6dc53ae2b0ca2b9e59978875a3d66743306ddf3b_s8-_U2PI.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/6e7281dec47e1c6aeff5d2e42e9541f0b7154187.jpg":"chunks/6e7281dec47e1c6aeff5d2e42e9541f0b7154187_9TGBIBjk.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/6ead3f58cacb15f208e66dde33009f923aff9626.jpg":"chunks/6ead3f58cacb15f208e66dde33009f923aff9626_BA-uPww1.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/6f3c1c9c7fde420927658bc978d812c3bacc794b.jpg":"chunks/6f3c1c9c7fde420927658bc978d812c3bacc794b_VVu1NxM1.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/6f68044ba69d343a801623bab3e549eacd46807c.jpg":"chunks/6f68044ba69d343a801623bab3e549eacd46807c_DFy5xGNK.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/6f6de4851722a521455cb0b5dbb8f973d3e9fc55.jpg":"chunks/6f6de4851722a521455cb0b5dbb8f973d3e9fc55_DRgbJJPv.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/6fdbe2e2cff8a26b26c1fd443f903779fb7faef0.jpg":"chunks/6fdbe2e2cff8a26b26c1fd443f903779fb7faef0_BNunlOFI.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/70e670e833270857df998599e39ad3af4564ed53.jpg":"chunks/70e670e833270857df998599e39ad3af4564ed53_WbIWUn8S.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/71b039af5d00b141e63f2d7afff86c65de1799d3.jpg":"chunks/71b039af5d00b141e63f2d7afff86c65de1799d3_B0kTAuNm.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/71cd04bfade4a7a3ea7e23ef6a58bbbab80ec335.jpg":"chunks/71cd04bfade4a7a3ea7e23ef6a58bbbab80ec335_CFCkO0No.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/721512f15e653e1d7dd2ca933c473269e61abfd1.jpg":"chunks/721512f15e653e1d7dd2ca933c473269e61abfd1_DUgwqGq3.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/726bf70ecb72f20168d7f0362462a6e55055664f.png":"chunks/726bf70ecb72f20168d7f0362462a6e55055664f_CeNP488z.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/72c79f7ebf5b03a210f6e7884aeac80074591c02.jpg":"chunks/72c79f7ebf5b03a210f6e7884aeac80074591c02_DkU3Q3tf.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/73bf5d05fb9cebe65afbe75dacef5bee4227cea7.jpg":"chunks/73bf5d05fb9cebe65afbe75dacef5bee4227cea7_ZNaCQyxc.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/7409a35269d93a64e0c6baaca2e7f27b42db60b3.jpg":"chunks/7409a35269d93a64e0c6baaca2e7f27b42db60b3_zhr8cVri.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/7421196c52005d78f02dd25232d81215f979bbf4.jpg":"chunks/7421196c52005d78f02dd25232d81215f979bbf4_DK2EOn5g.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/7462e9a44dbe3c92546c65b759030597827cc5cc.jpg":"chunks/7462e9a44dbe3c92546c65b759030597827cc5cc_BvAGEjjV.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/75374dbabf9eb1d7f5cfe01373a941c025abc6cf.jpg":"chunks/75374dbabf9eb1d7f5cfe01373a941c025abc6cf_DpKYlWnx.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/755f5913d2bd65480d04e70a70c4c732cfac95d5.jpg":"chunks/755f5913d2bd65480d04e70a70c4c732cfac95d5_BoNcINNW.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/75ecc07c6378c9fd592078d776da8036b46adbc5.jpg":"chunks/75ecc07c6378c9fd592078d776da8036b46adbc5_CsHIKvDS.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/75f12815b5dd1fc4cdbc654376ba70e6ed3afa45.jpg":"chunks/75f12815b5dd1fc4cdbc654376ba70e6ed3afa45_BVFHPOZh.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/7635f00064a23c7bc34cac1788f7068a9cff511c.jpg":"chunks/7635f00064a23c7bc34cac1788f7068a9cff511c_DyZvXHzn.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/763837e2e5b0742dd630c3606ce077354308f26d.jpg":"chunks/763837e2e5b0742dd630c3606ce077354308f26d_DFNEagD1.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/765aaa362485d08be35b85c6ef30dbea8798690d.jpg":"chunks/765aaa362485d08be35b85c6ef30dbea8798690d_D0ssaqfq.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/7693332ec30951c4afb4b7ff8eebef6f8ac75568.jpg":"chunks/7693332ec30951c4afb4b7ff8eebef6f8ac75568_D6UgxBW7.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/76b4e844a13c7dbd56de1eee6c730a6eaf5898f3.png":"chunks/76b4e844a13c7dbd56de1eee6c730a6eaf5898f3_DmEsAQ8t.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/76bd61e9d13581af6d59279f4a5c55a1ee065bb2.jpg":"chunks/76bd61e9d13581af6d59279f4a5c55a1ee065bb2_CJ2gyfTY.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/771aca673c6bf6645a61b9d63c82799c78bad91d.jpg":"chunks/771aca673c6bf6645a61b9d63c82799c78bad91d_D1O4L1GH.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/77646d19d97712106186cfb184c090d79f4c933a.jpg":"chunks/77646d19d97712106186cfb184c090d79f4c933a_DnVLcIes.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/77a3366045845fef65c35c42bcd7af00b580d9c1.jpg":"chunks/77a3366045845fef65c35c42bcd7af00b580d9c1_BvZ7uIBL.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/77ad34a48fd6f6953216129644d8f6df134a2edd.jpg":"chunks/77ad34a48fd6f6953216129644d8f6df134a2edd_CsLtw9_V.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/77bb5e5219026a5d5ae4865e6bf97c7c3754bc92.jpg":"chunks/77bb5e5219026a5d5ae4865e6bf97c7c3754bc92_BBNs0E96.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/781bfb9872fd697754521ccbadebe89fd7981b4e.jpg":"chunks/781bfb9872fd697754521ccbadebe89fd7981b4e_BsxzD5xN.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/783a693d5e1400fb72c23a7c8ccc8b5ad5b7888b.jpg":"chunks/783a693d5e1400fb72c23a7c8ccc8b5ad5b7888b_D5Y0XVej.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/786053dc62b413b5392eaba79f184fb1aa90a454.jpg":"chunks/786053dc62b413b5392eaba79f184fb1aa90a454_SOuXmQAq.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/78bc2a857211c033fa01d4d9d6fee2f1d55446f3.jpg":"chunks/78bc2a857211c033fa01d4d9d6fee2f1d55446f3_C7MsFS4N.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/78e4b7af2baa39d9b2ae00eb556cbaf12e8ea76c.jpg":"chunks/78e4b7af2baa39d9b2ae00eb556cbaf12e8ea76c_WYvIsnT3.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/79195ec2fcd7e7b0c96a740f16c8dbeaf29eaadf.jpg":"chunks/79195ec2fcd7e7b0c96a740f16c8dbeaf29eaadf_DnWLaGB5.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/79545bb4a8acb98f5818d4cb86059012236b6c1e.jpg":"chunks/79545bb4a8acb98f5818d4cb86059012236b6c1e_DI5TyeM1.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/795bd46c5935820a97e18e0269c0028f6ee4d49a.jpg":"chunks/795bd46c5935820a97e18e0269c0028f6ee4d49a_B948KI9j.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/79dadfa7267a6a4c01f1742854cf14638b3d8ebb.jpg":"chunks/79dadfa7267a6a4c01f1742854cf14638b3d8ebb_MkhI4Vr5.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/7a02ee23e7ab94f923f7cec8fc1256faa5f35e33.jpg":"chunks/7a02ee23e7ab94f923f7cec8fc1256faa5f35e33_tw-wkMUT.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/7a5252dae95d684dcc064902e5d8207e15f6ad18.jpg":"chunks/7a5252dae95d684dcc064902e5d8207e15f6ad18_DDqbsWED.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/7a5814b6fe19cd2fa832105e4097e04510f2ef46.jpg":"chunks/7a5814b6fe19cd2fa832105e4097e04510f2ef46_CfZvfjAG.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/7aa4ac04f6959927b1d58e2823930e0718460bbd.jpg":"chunks/7aa4ac04f6959927b1d58e2823930e0718460bbd_kJK0KbQt.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/7ae94e9d83fb51d3801616840352ad20a7db0a79.jpg":"chunks/7ae94e9d83fb51d3801616840352ad20a7db0a79_Ddin6BlJ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/7b0b255e458052cf256fd1d833a5fcc6850b322a.jpg":"chunks/7b0b255e458052cf256fd1d833a5fcc6850b322a_DaiwSGzC.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/7c1a441ee887bac9f45d41539b3f3aa1a134734e.jpg":"chunks/7c1a441ee887bac9f45d41539b3f3aa1a134734e_DbtvU8AC.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/7d029bd7919c473613dce1b607efca4f82f439e6.jpg":"chunks/7d029bd7919c473613dce1b607efca4f82f439e6_BXovPrKb.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/7d5643ca723ccdd73524933f0454bdcf6d0b7f29.jpg":"chunks/7d5643ca723ccdd73524933f0454bdcf6d0b7f29_DcaEpl9E.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/7f1b796236e6d465a3ca2d304e0543fe13ec4edb.jpg":"chunks/7f1b796236e6d465a3ca2d304e0543fe13ec4edb_D6p4YCTu.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/7f481c4c7fd4c455d38b7c42dd4c39f7e8bfeced.jpg":"chunks/7f481c4c7fd4c455d38b7c42dd4c39f7e8bfeced_1_pVQAA6.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/7fb848329e71eaea6995c74cfe9d3a5e05a28a9b.jpg":"chunks/7fb848329e71eaea6995c74cfe9d3a5e05a28a9b_CQxtw3pK.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/7fc8b9cf25461dfecfd3337c326fbc8e9a682f26.jpg":"chunks/7fc8b9cf25461dfecfd3337c326fbc8e9a682f26_Chk7lyvq.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/7fcdaef7096b9ab5dac12ed1043dbfebc3c25939.jpg":"chunks/7fcdaef7096b9ab5dac12ed1043dbfebc3c25939_D-Z_bDzg.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/806ad3c28bc6d4ab9b1ebec2310688a882dc2d05.jpg":"chunks/806ad3c28bc6d4ab9b1ebec2310688a882dc2d05_DX22uiXW.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/80784c24f505389073ef00b405e6fa8fd132b7f0.jpg":"chunks/80784c24f505389073ef00b405e6fa8fd132b7f0_BwMavcjB.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/80c866a42f3cec2a8b3e142d636b42fddb53417d.jpg":"chunks/80c866a42f3cec2a8b3e142d636b42fddb53417d_xqHJFFIc.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/814b9b2ba78b1bb587efbc1949392fdd88650d3f.jpg":"chunks/814b9b2ba78b1bb587efbc1949392fdd88650d3f_Cfok1b9t.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/8226542a1d631a60d41cd97d089a5665824ff7c2.jpg":"chunks/8226542a1d631a60d41cd97d089a5665824ff7c2_zESHU06z.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/82ec7788f0942a889d3c532658c99672c73ec7a1.jpg":"chunks/82ec7788f0942a889d3c532658c99672c73ec7a1_CNwkvWA_.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/83007e7464bf1472d2af1338d10a90469cc03423.jpg":"chunks/83007e7464bf1472d2af1338d10a90469cc03423_BqgpkbzL.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/830634fd6b0046801801e7a4c9bfa84ff819ae67.jpg":"chunks/830634fd6b0046801801e7a4c9bfa84ff819ae67_C4KPS46t.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/831368c9b4b416b33d9f09b70a432397a6259c2e.jpg":"chunks/831368c9b4b416b33d9f09b70a432397a6259c2e_CORTpjJo.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/8327c135ebc45d0975237b65f7f387e5a4f0ab33.jpg":"chunks/8327c135ebc45d0975237b65f7f387e5a4f0ab33_D7JbM3G-.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/83b93e7026c535fe5161c9c0178c261e4f997474.jpg":"chunks/83b93e7026c535fe5161c9c0178c261e4f997474_C9tMeHW6.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/83ef52a8492a9672648f8b73a0e124b684374bde.jpg":"chunks/83ef52a8492a9672648f8b73a0e124b684374bde_EkndhGy0.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/84e00a9ea4ca0a6504d4ccead530eeb20a031760.png":"chunks/84e00a9ea4ca0a6504d4ccead530eeb20a031760_CbU_42bb.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/860ebb1def519396de04990f371cd965724dac8f.jpg":"chunks/860ebb1def519396de04990f371cd965724dac8f_ByLbWYUm.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/863f53c01a150af7affc97c2616f0c3799a479ad.jpg":"chunks/863f53c01a150af7affc97c2616f0c3799a479ad_Bhn7eVGN.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/86b15a08ded276b36365fddb6491ccaa47725ff4.jpg":"chunks/86b15a08ded276b36365fddb6491ccaa47725ff4_CRB9AXDd.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/877ea901189af83dccf239316c36ce7b560822a9.png":"chunks/877ea901189af83dccf239316c36ce7b560822a9_JHkOZxTo.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/87903d5bacb5196c5a40948219d61b63b3c04afb.jpg":"chunks/87903d5bacb5196c5a40948219d61b63b3c04afb_CO7dM3wQ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/884436eb153dd44fdc0bb998c457360485891d32.jpg":"chunks/884436eb153dd44fdc0bb998c457360485891d32_CXK0qIe0.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/88712a23586aeb178999214ebbbcb47f9511f218.jpg":"chunks/88712a23586aeb178999214ebbbcb47f9511f218_CgihRpuF.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/890af9b939667ac168431c5758d6467bc692b267.jpg":"chunks/890af9b939667ac168431c5758d6467bc692b267_D9BfWyoQ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/8936146147b8426749d461993b0ccf43ca482c8c.jpg":"chunks/8936146147b8426749d461993b0ccf43ca482c8c_jKyTlPH3.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/8a23ea3ba0932681a6a3e4b21935602c1e45dc0b.jpg":"chunks/8a23ea3ba0932681a6a3e4b21935602c1e45dc0b_DsZC-7lB.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/8ae468f03e222f2a6b72fde53c495a3a2ff3ce17.jpg":"chunks/8ae468f03e222f2a6b72fde53c495a3a2ff3ce17_Bc5h1qOQ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/8b4f38f17a4110fc2a6d7addfdc1064f6a30690a.jpg":"chunks/8b4f38f17a4110fc2a6d7addfdc1064f6a30690a_BAAM72Ug.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/8bda81ac41679ce542fac0f64a273696828debf9.jpg":"chunks/8bda81ac41679ce542fac0f64a273696828debf9_DWQQQOD7.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/8bdf1d837e2b3534f3c59a346d251f9e4ec12d2d.jpg":"chunks/8bdf1d837e2b3534f3c59a346d251f9e4ec12d2d_DMFAIDEw.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/8bf59d7197a4a4222b55638cec39f011846d0e30.jpg":"chunks/8bf59d7197a4a4222b55638cec39f011846d0e30_CXrnuo5N.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/8c88a6eafd1f220f977cd72ca42a919530e118b6.jpg":"chunks/8c88a6eafd1f220f977cd72ca42a919530e118b6_QZYOeOs7.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/8db6bea5ce3324675d925ba23a1de57d29c9466a.jpg":"chunks/8db6bea5ce3324675d925ba23a1de57d29c9466a_DA1HUlQR.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/8e05cca047874735b83eab147ad941c0471341cd.jpg":"chunks/8e05cca047874735b83eab147ad941c0471341cd_CjJqOUWx.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/8e2eaec89d86d0f53cef52d03511a8c3fd5410ef.jpg":"chunks/8e2eaec89d86d0f53cef52d03511a8c3fd5410ef_D65BepJO.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/8f409b36f5590fff2502b29f109eaf4c9b2f3692.png":"chunks/8f409b36f5590fff2502b29f109eaf4c9b2f3692_B2KZHCYd.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/8f5e78eae77486f9fbb599339007232a72ab6768.jpg":"chunks/8f5e78eae77486f9fbb599339007232a72ab6768_BvFk423Y.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/8f6923eff64802d051611b3ce4a484cd2e80b771.jpg":"chunks/8f6923eff64802d051611b3ce4a484cd2e80b771_DR0HpTXo.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/8fbd12b029ee53e3816d47f8ca6c4d3238b952cc.jpg":"chunks/8fbd12b029ee53e3816d47f8ca6c4d3238b952cc_BUBcO0uP.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/904be677dc32abff73a8395bbc85f6bc47248dda.png":"chunks/904be677dc32abff73a8395bbc85f6bc47248dda_DyTdYp4i.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/90550990f44a1d9d8e7649896fa2745f8fbf30c4.jpg":"chunks/90550990f44a1d9d8e7649896fa2745f8fbf30c4_BkNSu2w8.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/910352ae5f1865407c0b0f1775334564cb89bea4.jpg":"chunks/910352ae5f1865407c0b0f1775334564cb89bea4_kNa0vyt4.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/9194c0438cdc48fa63e6cf3ee5580fff9eab5f49.png":"chunks/9194c0438cdc48fa63e6cf3ee5580fff9eab5f49_qNz6UARp.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/91ce6da26d36c59eb4379613f2f3ad42d3c5c042.jpg":"chunks/91ce6da26d36c59eb4379613f2f3ad42d3c5c042_BAY4cRxS.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/91d01191ee54ec00ea3a4df5d4a5757fb6a08058.jpg":"chunks/91d01191ee54ec00ea3a4df5d4a5757fb6a08058_apMXWru4.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/91fcdfe3e4acf67372a5161f44fe0f53c4ab8c37.jpg":"chunks/91fcdfe3e4acf67372a5161f44fe0f53c4ab8c37_CY4JKSPX.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/926-932-938-so-kingsley-01.webp":"chunks/926-932-938-so-kingsley-01_BPDa5CCH.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/926-932-938-so-kingsley-02.webp":"chunks/926-932-938-so-kingsley-02_BdA48CnW.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/926-932-938-so-kingsley-03.webp":"chunks/926-932-938-so-kingsley-03_T5H4IgAx.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/926-932-938-so-kingsley-04.webp":"chunks/926-932-938-so-kingsley-04_CdYHFhny.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/926-932-938-so-kingsley-05.webp":"chunks/926-932-938-so-kingsley-05_Ci305Rw1.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/926-932-938-so-kingsley-06.webp":"chunks/926-932-938-so-kingsley-06_eu8jtx_h.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/926-932-938-so-kingsley-07.webp":"chunks/926-932-938-so-kingsley-07_Cv-vqfIu.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/926-932-938-so-kingsley-08.webp":"chunks/926-932-938-so-kingsley-08_CSIQuklb.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/926-932-938-so-kingsley-09.webp":"chunks/926-932-938-so-kingsley-09_o2PJYjrG.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/926-932-938-so-kingsley-10.webp":"chunks/926-932-938-so-kingsley-10_EnOWd0If.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/926-932-938-so-kingsley-11.webp":"chunks/926-932-938-so-kingsley-11_Dx0cjQnW.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/926-932-938-so-kingsley-12.webp":"chunks/926-932-938-so-kingsley-12_C00jSIDY.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/926-932-938-so-kingsley-13.webp":"chunks/926-932-938-so-kingsley-13_DpavYV7i.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/926-932-938-so-kingsley-14.webp":"chunks/926-932-938-so-kingsley-14_DwClcN84.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/926-932-938-so-kingsley-15.webp":"chunks/926-932-938-so-kingsley-15_8cwQ2wQa.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/926-932-938-so-kingsley-16.webp":"chunks/926-932-938-so-kingsley-16_B2vrdBdQ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/926-932-938-so-kingsley-17.webp":"chunks/926-932-938-so-kingsley-17_Bx3h9b6N.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/933-s-gramercy-pl-01.webp":"chunks/933-s-gramercy-pl-01_Bf8jPOkW.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/933-s-gramercy-pl-02.webp":"chunks/933-s-gramercy-pl-02_gp5THG5L.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/933-s-gramercy-pl-03.webp":"chunks/933-s-gramercy-pl-03_CZXuv9bU.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/933-s-gramercy-pl-04.webp":"chunks/933-s-gramercy-pl-04_CewYqFbG.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/933-s-gramercy-pl-05.webp":"chunks/933-s-gramercy-pl-05_BRijIgXW.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/933-s-gramercy-pl-06.webp":"chunks/933-s-gramercy-pl-06_DjwvhFCW.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/9421db5a35fec681f8837cd54948b5a00b542a60.png":"chunks/9421db5a35fec681f8837cd54948b5a00b542a60_Cb9maBQH.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/94ce7bb4e9056753d37f98a04fa92ebcc0b854ab.png":"chunks/94ce7bb4e9056753d37f98a04fa92ebcc0b854ab_DyfGiD4F.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/94d2e5dfd04d674d2fc6554e7b4dfc587f043ada.jpg":"chunks/94d2e5dfd04d674d2fc6554e7b4dfc587f043ada_3dLga7_S.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/950-s-wilton-place-01.webp":"chunks/950-s-wilton-place-01_COhK_ch3.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/950-s-wilton-place-02.webp":"chunks/950-s-wilton-place-02_5qkkkJGT.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/950-s-wilton-place-03.webp":"chunks/950-s-wilton-place-03_CpGK33RJ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/950-s-wilton-place-04.webp":"chunks/950-s-wilton-place-04_CHSeg2d8.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/950-s-wilton-place-05.webp":"chunks/950-s-wilton-place-05_BsGjRU1u.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/950-s-wilton-place-06.webp":"chunks/950-s-wilton-place-06_Jv4HrIOw.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/950-s-wilton-place-07.webp":"chunks/950-s-wilton-place-07_6D9152jl.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/950-s-wilton-place-08.webp":"chunks/950-s-wilton-place-08_tsbhMrMf.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/957-963-and-967-arapahoe-01.webp":"chunks/957-963-and-967-arapahoe-01_D8P3Cl-l.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/957-963-and-967-arapahoe-02.webp":"chunks/957-963-and-967-arapahoe-02_BP6l3yz4.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/957-963-and-967-arapahoe-03.webp":"chunks/957-963-and-967-arapahoe-03_BF28hP6W.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/957-963-and-967-arapahoe-04.webp":"chunks/957-963-and-967-arapahoe-04_DGGAPin9.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/957-963-and-967-arapahoe-05.webp":"chunks/957-963-and-967-arapahoe-05_CXvwn6My.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/957-963-and-967-arapahoe-06.webp":"chunks/957-963-and-967-arapahoe-06_4WblsjAJ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/957-963-and-967-arapahoe-07.webp":"chunks/957-963-and-967-arapahoe-07_6qYN8UHU.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/957-963-and-967-arapahoe-08.webp":"chunks/957-963-and-967-arapahoe-08_C8jR_zac.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/957-963-and-967-arapahoe-09.webp":"chunks/957-963-and-967-arapahoe-09_BXp-Z8Qy.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/957-963-and-967-arapahoe-10.webp":"chunks/957-963-and-967-arapahoe-10_Bt_OvWoY.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/957-963-and-967-arapahoe-11.webp":"chunks/957-963-and-967-arapahoe-11_DL3Rzx1T.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/957-963-and-967-arapahoe-12.webp":"chunks/957-963-and-967-arapahoe-12_DG0BK1Dk.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/957-963-and-967-arapahoe-13.webp":"chunks/957-963-and-967-arapahoe-13_DbLPicDd.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/957-963-and-967-arapahoe-14.webp":"chunks/957-963-and-967-arapahoe-14_CJiID4C9.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/957-963-and-967-arapahoe-15.webp":"chunks/957-963-and-967-arapahoe-15_Be1GfZ71.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/957-963-and-967-arapahoe-16.webp":"chunks/957-963-and-967-arapahoe-16_B-AUQHaR.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/964d4d2275fc16bfa3a7660dc1568ae93036c0e8.jpg":"chunks/964d4d2275fc16bfa3a7660dc1568ae93036c0e8_6rPJdvED.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/9696747c53bfca2d19d2fb454910a914a06f6fc5.jpg":"chunks/9696747c53bfca2d19d2fb454910a914a06f6fc5_CMOawKEq.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/97c6820953bfa3ea203daf4ee0728bcfbee0ec7a.jpg":"chunks/97c6820953bfa3ea203daf4ee0728bcfbee0ec7a_5LNuxl81.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/981b3774de858221bb0e919342bcd9c4f81acf16.jpg":"chunks/981b3774de858221bb0e919342bcd9c4f81acf16_CqOM9-DW.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/983bef1b954fd4169bc005cbc33376e1d216d490.jpg":"chunks/983bef1b954fd4169bc005cbc33376e1d216d490_C0JeLu0y.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/9864ff904d043a7033b2c13acf85ae53ba5c7383.jpg":"chunks/9864ff904d043a7033b2c13acf85ae53ba5c7383_56V5QcO_.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/99a755e3a6bbf5899c60a87dafcb848da10e552c.jpg":"chunks/99a755e3a6bbf5899c60a87dafcb848da10e552c_YJkVVA8g.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/99d47db88dfb83b37c17cd581be40f82af4b0a80.jpg":"chunks/99d47db88dfb83b37c17cd581be40f82af4b0a80_USYaPdDP.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/99d74c76ea01422df224298f324d38b5d815bd02.jpg":"chunks/99d74c76ea01422df224298f324d38b5d815bd02_h3b8DiA7.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/99e45c142a8e8fd77579d43d450258d8334947d2.jpg":"chunks/99e45c142a8e8fd77579d43d450258d8334947d2_D5QqMAVo.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/9a0b9dae7dbde06a65788edaf0e92f0a443ca4bc.jpg":"chunks/9a0b9dae7dbde06a65788edaf0e92f0a443ca4bc_DOBi1-tX.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/9b07816d64214391c281c131a7f59a53a0932541.jpg":"chunks/9b07816d64214391c281c131a7f59a53a0932541_DzVgFJUG.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/9b2c89c2604017dc310dbe239251d5585a182ace.jpg":"chunks/9b2c89c2604017dc310dbe239251d5585a182ace_BkIF_fgG.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/9b3bb02276e6e80733de626ca6f35f4b045c98a6.jpg":"chunks/9b3bb02276e6e80733de626ca6f35f4b045c98a6_DJJreLJb.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/9b47d07a1c4b9bc32da06eb999cde23f78b66a67.jpg":"chunks/9b47d07a1c4b9bc32da06eb999cde23f78b66a67_B_XKRTaz.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/9b96f248280aa4796a4e58bb28fb07a8802c8b36.jpg":"chunks/9b96f248280aa4796a4e58bb28fb07a8802c8b36_BwVzjpEx.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/9bb0259a039ef71f774ad7b62e74e26980d18d0b.jpg":"chunks/9bb0259a039ef71f774ad7b62e74e26980d18d0b_C8Mmj0W7.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/9c2ac10924b19f1b258e891704c3ac2728725025.jpg":"chunks/9c2ac10924b19f1b258e891704c3ac2728725025_SCRskLTW.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/9c3382ba68e6129b40914ee84bf3744c8dd3808a.jpg":"chunks/9c3382ba68e6129b40914ee84bf3744c8dd3808a_Bd0iwtLq.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/9c6673ce2baf310e15ad5b143901f45bcc88b38c.jpg":"chunks/9c6673ce2baf310e15ad5b143901f45bcc88b38c_DUBMZlz3.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/9cc9dce1612da77a75657d16e21c55cc29def765.jpg":"chunks/9cc9dce1612da77a75657d16e21c55cc29def765_pFZXIGeB.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/9d05fb24565f6154fc8d3239cbb40e5a95230b89.png":"chunks/9d05fb24565f6154fc8d3239cbb40e5a95230b89_C2qM3XJf.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/9d067bd4ca905332492311958bd6c1b24b225686.png":"chunks/9d067bd4ca905332492311958bd6c1b24b225686_B7Q2NCMc.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/9da74638150ee173e0f6642622c92c863be9c744.jpg":"chunks/9da74638150ee173e0f6642622c92c863be9c744_B1Wq7m3a.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/9dc8bc8ef39739b8ebdcbc23ab342cac886c1ea9.jpg":"chunks/9dc8bc8ef39739b8ebdcbc23ab342cac886c1ea9_-knBp_iV.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/9ddd97c5131825e4879c105308f0fc24019f1b72.jpg":"chunks/9ddd97c5131825e4879c105308f0fc24019f1b72_CM8CgGOQ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/9e406fe1310c1dc825a54b4dd8dba531c26a12b4.jpg":"chunks/9e406fe1310c1dc825a54b4dd8dba531c26a12b4_pMVY2lSk.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/9e58368086e4d69a542c131172336e603cd510c0.jpg":"chunks/9e58368086e4d69a542c131172336e603cd510c0_CT5Cxv_s.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/9e92e162e2006f01f78d01c935e20f507138372d.jpg":"chunks/9e92e162e2006f01f78d01c935e20f507138372d_C7aIY4WB.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/9ed64c7c09b33c1092e1b6e8dee28550bdb3a209.jpg":"chunks/9ed64c7c09b33c1092e1b6e8dee28550bdb3a209_kXp42wcQ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/9f61a5efdc42e241623bbc15188fdc4bbc1f0833.jpg":"chunks/9f61a5efdc42e241623bbc15188fdc4bbc1f0833_DxHA6Ebw.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/9fb60ce3a7783b1cdfd54d18f377b9fe2b9dd424.jpg":"chunks/9fb60ce3a7783b1cdfd54d18f377b9fe2b9dd424_2Wp5TMNF.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/a-word-or-two-on-density-01.webp":"chunks/a-word-or-two-on-density-01_Bh9LiHe8.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/a-word-or-two-on-density-02.webp":"chunks/a-word-or-two-on-density-02_CQg1Xkxt.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/a-word-or-two-on-density-03.webp":"chunks/a-word-or-two-on-density-03_De2DgXI4.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/a-word-or-two-on-density-04.webp":"chunks/a-word-or-two-on-density-04_CvkTbHnD.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/a-word-or-two-on-density-05.webp":"chunks/a-word-or-two-on-density-05_po9NY0xv.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/a-word-or-two-on-density-06.webp":"chunks/a-word-or-two-on-density-06_oXUxTJyT.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/a-word-or-two-on-density-07.webp":"chunks/a-word-or-two-on-density-07_BCAuBV0n.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/a0cf8bd0c977c7f2c7486b5c731e77c4113225f2.jpg":"chunks/a0cf8bd0c977c7f2c7486b5c731e77c4113225f2_CJYOgBwV.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/a201a1b1b33320fd3846332fd5a82f3f2b9729a9.jpg":"chunks/a201a1b1b33320fd3846332fd5a82f3f2b9729a9_5NK7jkej.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/a206e0e90e1faf613b534fd73853ad13ce392196.jpg":"chunks/a206e0e90e1faf613b534fd73853ad13ce392196_BnSC_Y7p.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/a24686642cc028d9b48a7de9d909d34ff4c839e1.jpg":"chunks/a24686642cc028d9b48a7de9d909d34ff4c839e1_Cet71mEC.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/a2bce131bec2de85bea5dada607fd528a3c1715e.jpg":"chunks/a2bce131bec2de85bea5dada607fd528a3c1715e_BXCHVgO9.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/a2d9125e4fdcd4fbe47c60a20af1195bf02de885.jpg":"chunks/a2d9125e4fdcd4fbe47c60a20af1195bf02de885_D5LMdZP2.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/a2e936337f14f0eb103034f4983f2eaf32d51cfe.jpg":"chunks/a2e936337f14f0eb103034f4983f2eaf32d51cfe_gHwBEydL.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/a3a137273d0099820543929f962a472a5212d30a.jpg":"chunks/a3a137273d0099820543929f962a472a5212d30a_Dr7A0G-V.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/a428b3399c01da031c12668495310eb4447acb00.jpg":"chunks/a428b3399c01da031c12668495310eb4447acb00_p1Mktje1.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/a47343d75186aead0c4e4f0f03b5bc043fda62fa.jpg":"chunks/a47343d75186aead0c4e4f0f03b5bc043fda62fa_CrMoigbE.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/a4862512b68df5d8766a06e291992a9555c88bb2.jpg":"chunks/a4862512b68df5d8766a06e291992a9555c88bb2_kjnP-aM4.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/a4df7e9fa3c433cc17922990318fc48a6b5ce1e5.jpg":"chunks/a4df7e9fa3c433cc17922990318fc48a6b5ce1e5_xIwdD0K2.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/a525760d22afbf6bed8d3f1286131e3a0f0b88a5.jpg":"chunks/a525760d22afbf6bed8d3f1286131e3a0f0b88a5_BNErcMFb.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/a526543bf5d14d6a388fe139ef66fe8cc1d0f363.jpg":"chunks/a526543bf5d14d6a388fe139ef66fe8cc1d0f363_CaOyRG7-.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/a54625e5bf61a6a45fc46a955b55d6b22a69b247.jpg":"chunks/a54625e5bf61a6a45fc46a955b55d6b22a69b247_DFj6InsJ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/a567ad91e325c3b400e1f2d23656d6daeff24445.jpg":"chunks/a567ad91e325c3b400e1f2d23656d6daeff24445_BAB1v6C7.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/a5da2709dec5e703bacdc72a49cac2b96269480c.jpg":"chunks/a5da2709dec5e703bacdc72a49cac2b96269480c_CEPW5BZN.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/a62a137f8901b1530cd31c0056c9c184b12e6775.jpg":"chunks/a62a137f8901b1530cd31c0056c9c184b12e6775_C0i9GgGz.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/a646911043c6c22f1c1a8f84e3ea989b35c7afd5.jpg":"chunks/a646911043c6c22f1c1a8f84e3ea989b35c7afd5_C-U4t4gF.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/a720e08d827fcb325f8cc4e673cef4fdfc4d79cd.jpg":"chunks/a720e08d827fcb325f8cc4e673cef4fdfc4d79cd_DOam_Bk_.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/a81bb3eb729735b02412c9342824c5eded925fb8.jpg":"chunks/a81bb3eb729735b02412c9342824c5eded925fb8_CcgpNTKe.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/a8c92b5c431765728021c84f15b3485bc41dd703.jpg":"chunks/a8c92b5c431765728021c84f15b3485bc41dd703_B8VLbZ58.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/a90b5da90066676faaacf71e3a405c164e17a6d0.jpg":"chunks/a90b5da90066676faaacf71e3a405c164e17a6d0_FeYVT89f.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/a924b111faacb5441b4fb9ab9aff6971dcf0c1d5.jpg":"chunks/a924b111faacb5441b4fb9ab9aff6971dcf0c1d5_BAH3KdD5.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/aa023c6586da6cd74e1a5a88cc3839770c8896e0.jpg":"chunks/aa023c6586da6cd74e1a5a88cc3839770c8896e0_CdIN40kp.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/aad0902ed74837202e6cfcfdb285d940515c3cec.jpg":"chunks/aad0902ed74837202e6cfcfdb285d940515c3cec_hZ3YyvTl.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/ab1cdfb759afb28adfead93060b00b5d60e93a8f.jpg":"chunks/ab1cdfb759afb28adfead93060b00b5d60e93a8f_y3GxTf_M.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/ab259eb4c4d7ee71ca80e6fecd82831838bff6ba.jpg":"chunks/ab259eb4c4d7ee71ca80e6fecd82831838bff6ba_BWQ7MnYM.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/ab2fc2bfd767bceb9f1b01cc16117828201fc03a.jpg":"chunks/ab2fc2bfd767bceb9f1b01cc16117828201fc03a_DBtv6OXV.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/ab801e37a2356c5d93fb132097241abf3060261e.jpg":"chunks/ab801e37a2356c5d93fb132097241abf3060261e_DWDxMgbw.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/abf78a465a38dd5b914db4de4ce67189cc990373.jpg":"chunks/abf78a465a38dd5b914db4de4ce67189cc990373_ClbFZiPw.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/ac72a61922ec2d0a184bed85332260f67087761f.jpg":"chunks/ac72a61922ec2d0a184bed85332260f67087761f_BXSiGKTW.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/ac72aaca7bd576bff42cea9dfa0da88720f37a4a.jpg":"chunks/ac72aaca7bd576bff42cea9dfa0da88720f37a4a_BzXnoVH1.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/acd38a5d42328c18a25e19f8e98bc3370d23595a.jpg":"chunks/acd38a5d42328c18a25e19f8e98bc3370d23595a_D9xkgMdT.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/ad55f6183cc58c9be2fb5694d57e2ef503ef9ae7.jpg":"chunks/ad55f6183cc58c9be2fb5694d57e2ef503ef9ae7_CsUfEkId.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/ae326d15c0c20c00e0c322fc1882c1c549f74c47.jpg":"chunks/ae326d15c0c20c00e0c322fc1882c1c549f74c47_C6KA3SUZ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/ae723f4b939192a0980b7b35624c9445a07638e2.jpg":"chunks/ae723f4b939192a0980b7b35624c9445a07638e2_BMQ_QvmJ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/ae9bf6b033f6e7d3980b23435258e9fa125b9319.jpg":"chunks/ae9bf6b033f6e7d3980b23435258e9fa125b9319_D5HTcEPE.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/aec104886e086df901fae176e5606546cbf26123.jpg":"chunks/aec104886e086df901fae176e5606546cbf26123_BzkEs7nK.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/aecca11fc16b2561e9ba3baa52f7f2b902e308a1.jpg":"chunks/aecca11fc16b2561e9ba3baa52f7f2b902e308a1_D0Ny5e9h.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/aefc83d6ea5fc87cb23ea95d1fae8270db7cee33.jpg":"chunks/aefc83d6ea5fc87cb23ea95d1fae8270db7cee33_BcRRdyb3.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/af0cb591c55772249fc2f057718cdefbb0c1ae3a.jpg":"chunks/af0cb591c55772249fc2f057718cdefbb0c1ae3a_WL9wCV3r.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/af3cbb2af00e5c91e68cb51ea383d2614e9ed565.jpg":"chunks/af3cbb2af00e5c91e68cb51ea383d2614e9ed565_CynalB59.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/af48c2481cd2b04be1a0c64d18529e2c2adcb364.jpg":"chunks/af48c2481cd2b04be1a0c64d18529e2c2adcb364_Cqmj09cI.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/aff8caf5666eb1e4b827b08b9d88d088dc3bc134.jpg":"chunks/aff8caf5666eb1e4b827b08b9d88d088dc3bc134_BdxzH6oc.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/an-appeal-to-reason-at-1537-south-wilton-pl-01.webp":"chunks/an-appeal-to-reason-at-1537-south-wilton-pl-01__6GIlVz3.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/an-appeal-to-reason-at-1537-south-wilton-pl-02.webp":"chunks/an-appeal-to-reason-at-1537-south-wilton-pl-02_Tg0_Tlsg.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/an-appeal-to-reason-at-1537-south-wilton-pl-03.webp":"chunks/an-appeal-to-reason-at-1537-south-wilton-pl-03_DJIziOjw.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/an-appeal-to-reason-at-1537-south-wilton-pl-04.webp":"chunks/an-appeal-to-reason-at-1537-south-wilton-pl-04_o-vvwuJM.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/an-appeal-to-reason-at-1537-south-wilton-pl-05.webp":"chunks/an-appeal-to-reason-at-1537-south-wilton-pl-05_BdkXP-lO.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/an-appeal-to-reason-at-1537-south-wilton-pl-06.webp":"chunks/an-appeal-to-reason-at-1537-south-wilton-pl-06_l7UhuJ-f.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/an-appeal-to-reason-at-1537-south-wilton-pl-07.webp":"chunks/an-appeal-to-reason-at-1537-south-wilton-pl-07_DoV7H372.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/an-appeal-to-reason-at-1537-south-wilton-pl-08.webp":"chunks/an-appeal-to-reason-at-1537-south-wilton-pl-08_CYf_HTc8.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/an-appeal-to-reason-at-1537-south-wilton-pl-09.webp":"chunks/an-appeal-to-reason-at-1537-south-wilton-pl-09_CuOX6tfm.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/an-appeal-to-reason-at-1537-south-wilton-pl-10.webp":"chunks/an-appeal-to-reason-at-1537-south-wilton-pl-10_LJIEa33w.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/and-we-re-back-01.webp":"chunks/and-we-re-back-01_Cl3haBQt.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/art-deco-pico-01.webp":"chunks/art-deco-pico-01_DYXxCFXK.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/art-deco-pico-02.webp":"chunks/art-deco-pico-02_Dxuomfkt.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/art-deco-pico-03.webp":"chunks/art-deco-pico-03_BuEwHIrt.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/art-deco-pico-04.webp":"chunks/art-deco-pico-04_BaVs_8zO.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/art-deco-pico-05.webp":"chunks/art-deco-pico-05_BPGxY8VH.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/art-deco-pico-06.webp":"chunks/art-deco-pico-06_DKTsSOzd.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/art-deco-pico-07.webp":"chunks/art-deco-pico-07_BntFhVi9.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/art-deco-pico-08.webp":"chunks/art-deco-pico-08_C1iaOIrh.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/b-nai-b-rith-846-south-union-ave-01.webp":"chunks/b-nai-b-rith-846-south-union-ave-01_BwntLRwi.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/b-nai-b-rith-846-south-union-ave-02.webp":"chunks/b-nai-b-rith-846-south-union-ave-02_BtASdInr.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/b-nai-b-rith-846-south-union-ave-03.webp":"chunks/b-nai-b-rith-846-south-union-ave-03_Dn4ZHGZs.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/b-nai-b-rith-846-south-union-ave-04.webp":"chunks/b-nai-b-rith-846-south-union-ave-04_0ZHGKmpK.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/b-nai-b-rith-846-south-union-ave-05.webp":"chunks/b-nai-b-rith-846-south-union-ave-05_CEGrkemL.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/b-nai-b-rith-846-south-union-ave-06.webp":"chunks/b-nai-b-rith-846-south-union-ave-06_B3SM5uQE.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/b-nai-b-rith-846-south-union-ave-07.webp":"chunks/b-nai-b-rith-846-south-union-ave-07_irEvlWpy.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/b-nai-b-rith-846-south-union-ave-08.webp":"chunks/b-nai-b-rith-846-south-union-ave-08_CKFGJSCy.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/b-nai-b-rith-846-south-union-ave-09.webp":"chunks/b-nai-b-rith-846-south-union-ave-09_DYLylfN0.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/b-nai-b-rith-846-south-union-ave-10.webp":"chunks/b-nai-b-rith-846-south-union-ave-10_CaDT_tsA.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/b-nai-b-rith-846-south-union-ave-11.webp":"chunks/b-nai-b-rith-846-south-union-ave-11_usP5rsQ4.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/b-nai-b-rith-846-south-union-ave-12.webp":"chunks/b-nai-b-rith-846-south-union-ave-12_VXZQu4dJ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/b-nai-b-rith-846-south-union-ave-13.webp":"chunks/b-nai-b-rith-846-south-union-ave-13_BpaOLoWH.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/b-nai-b-rith-846-south-union-ave-14.webp":"chunks/b-nai-b-rith-846-south-union-ave-14_DqhTqRES.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/b-nai-b-rith-846-south-union-ave-15.webp":"chunks/b-nai-b-rith-846-south-union-ave-15_CXoy-590.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/b-nai-b-rith-846-south-union-ave-16.webp":"chunks/b-nai-b-rith-846-south-union-ave-16_DB_z5BR3.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/b-nai-b-rith-846-south-union-ave-17.webp":"chunks/b-nai-b-rith-846-south-union-ave-17_DYTCoNXj.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/b-nai-b-rith-846-south-union-ave-18.webp":"chunks/b-nai-b-rith-846-south-union-ave-18_B6A_SyWK.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/b014c43d56b53aba7d00d22175a9c94ea42a3212.jpg":"chunks/b014c43d56b53aba7d00d22175a9c94ea42a3212_BojBtQiR.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/b0422909e1d6a0ab3479070b7be5ecb72b826b5d.png":"chunks/b0422909e1d6a0ab3479070b7be5ecb72b826b5d_KQ8QKJVK.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/b0a6f386b82b4a6c668df42f752e8d1ddaa5f213.jpg":"chunks/b0a6f386b82b4a6c668df42f752e8d1ddaa5f213_N7cOsiph.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/b12cd836313730e3e6bf635f37402a03acd62b10.jpg":"chunks/b12cd836313730e3e6bf635f37402a03acd62b10_BxSZsdef.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/b159fe3611aedce08df41ecdd46bab1b5b75b201.jpg":"chunks/b159fe3611aedce08df41ecdd46bab1b5b75b201_DScxdDQx.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/b22b9595f01e30e35ee1faa57bff93b2023621ef.jpg":"chunks/b22b9595f01e30e35ee1faa57bff93b2023621ef_uTGxiY9P.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/b289a4766736589627d3e1411b83d9b417e4eb60.jpg":"chunks/b289a4766736589627d3e1411b83d9b417e4eb60_BkRMDUic.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/b29a4138776ae8cbe84e19aed12eb803063a92b6.jpg":"chunks/b29a4138776ae8cbe84e19aed12eb803063a92b6_BFu1HZxr.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/b305489579c8fd48be8a32d6217ef16eb2e21868.jpg":"chunks/b305489579c8fd48be8a32d6217ef16eb2e21868_BWTfOIGx.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/b32c11e63b407bef8b9e354a5c62994d6af76483.jpg":"chunks/b32c11e63b407bef8b9e354a5c62994d6af76483_CEerf2_n.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/b34ee4490356ac98b2f337d7c593b9333aa5e12d.jpg":"chunks/b34ee4490356ac98b2f337d7c593b9333aa5e12d_BAhR_FUJ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/b485938fe400c7318f7fb86d30371db383c86c64.jpg":"chunks/b485938fe400c7318f7fb86d30371db383c86c64_Bhz2Z4hJ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/b4f4a674854a5ccc71bc0e930f1dff5cbbecb116.png":"chunks/b4f4a674854a5ccc71bc0e930f1dff5cbbecb116_BJ6NdFTC.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/b52066c6464827a24748c163388de1f2c3dba4a6.jpg":"chunks/b52066c6464827a24748c163388de1f2c3dba4a6_C7N9qJ2w.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/b57a0d3af3fcc86599f47179ce1e8a1b54d06f1f.png":"chunks/b57a0d3af3fcc86599f47179ce1e8a1b54d06f1f_D8c01qEr.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/b68f866bd9aa46fb9ede5c6abd80a2b3fae1b17d.jpg":"chunks/b68f866bd9aa46fb9ede5c6abd80a2b3fae1b17d_BJArRAVd.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/b6acc02190b9570eecb4a53f125f3bd4564c430b.jpg":"chunks/b6acc02190b9570eecb4a53f125f3bd4564c430b_CpDe7Qrs.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/b7402fd8bc2cc682fd244895da360817bed219e4.jpg":"chunks/b7402fd8bc2cc682fd244895da360817bed219e4_FyMMLbki.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/b8396bd1a2b3ec9673a0391e5cccde2f17237ba9.png":"chunks/b8396bd1a2b3ec9673a0391e5cccde2f17237ba9_qMCT475K.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/b85203cca3178c0e8f348f3effb9afccbc149543.jpg":"chunks/b85203cca3178c0e8f348f3effb9afccbc149543_Bfu4I1I9.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/b856ccd4d6de0776c6604aa151b271d1da18b652.jpg":"chunks/b856ccd4d6de0776c6604aa151b271d1da18b652_Qg34lW1E.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/b88e37eec2e3ad965fd11dd15db66e710176b233.png":"chunks/b88e37eec2e3ad965fd11dd15db66e710176b233_BXuAgK__.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/b9463193f11962fca2961a8824058aec5b622b23.jpg":"chunks/b9463193f11962fca2961a8824058aec5b622b23_V_GRWKOW.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/b99c9bcaf07ba7e95576aaadf83fd0b029903d86.jpg":"chunks/b99c9bcaf07ba7e95576aaadf83fd0b029903d86_DQMGmSlY.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/ba8074ea307dde96d798528dfc3718a62f8c9133.jpg":"chunks/ba8074ea307dde96d798528dfc3718a62f8c9133_dwyetpmI.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/bb1d716ef972d878a57c086ff294f819f2db6c1d.jpg":"chunks/bb1d716ef972d878a57c086ff294f819f2db6c1d_Caepr6mL.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/bbbe7f31000110097cebaf7e6d4fe2e7ba9a7cbc.png":"chunks/bbbe7f31000110097cebaf7e6d4fe2e7ba9a7cbc_CmP2gYtN.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/bbd2e6a2d5126ea8aa4c20bbb56926c11f79df8b.jpg":"chunks/bbd2e6a2d5126ea8aa4c20bbb56926c11f79df8b_UsLbnl_L.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/bc132bb6b8bb90c8ff1ae0a4e55f0de08d4e1749.jpg":"chunks/bc132bb6b8bb90c8ff1ae0a4e55f0de08d4e1749_BCkukYiY.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/bc3d17c0868012f5204b910ff8b2217e0f8f7cf2.jpg":"chunks/bc3d17c0868012f5204b910ff8b2217e0f8f7cf2_Di8ZHLiT.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/bc627d8f8a78a84723c10db0bcf51c5acdd492ee.png":"chunks/bc627d8f8a78a84723c10db0bcf51c5acdd492ee_g3lsuLf_.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/bcab64a422f578e4868a24104ee72943b1eee7b5.jpg":"chunks/bcab64a422f578e4868a24104ee72943b1eee7b5_BCKH6R6S.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/bd588fd0775551dda333a205bd4082fd92dc7c52.jpg":"chunks/bd588fd0775551dda333a205bd4082fd92dc7c52_D5kZ-awn.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/be58e053be19466edd2cc65dfcda8504df69bad0.jpg":"chunks/be58e053be19466edd2cc65dfcda8504df69bad0_B19k8C-4.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/befa21a51bb7e6da3ca6fd14471c6beff04321ec.jpg":"chunks/befa21a51bb7e6da3ca6fd14471c6beff04321ec_DyLJyPG6.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/bfd5a91a84ad75c622003348e07a49847f2b4bf2.jpg":"chunks/bfd5a91a84ad75c622003348e07a49847f2b4bf2_CWldRReJ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/c09340a25f6fd26925cfd65a899c7703dc72d8a9.jpg":"chunks/c09340a25f6fd26925cfd65a899c7703dc72d8a9_qa6yVpTC.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/c0963131668f63dc4d9b4f135bcf6717c2e19072.jpg":"chunks/c0963131668f63dc4d9b4f135bcf6717c2e19072_Czks3z-X.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/c0e109476b4a80082e5b3875effc225b10df2ca6.jpg":"chunks/c0e109476b4a80082e5b3875effc225b10df2ca6_aQFLGp1O.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/c1af67f69416279b0a710593c60c327cd48b69fa.jpg":"chunks/c1af67f69416279b0a710593c60c327cd48b69fa_DcFmGg2q.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/c1f884ab5eae80d052f830ec6f465e781097565b.jpg":"chunks/c1f884ab5eae80d052f830ec6f465e781097565b_CL1RjvVW.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/c23c2004b4ddcd81ba105d1f3e131ad8e4b14d84.jpg":"chunks/c23c2004b4ddcd81ba105d1f3e131ad8e4b14d84_CLrLvTKT.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/c24373cf265f84e908864bb375793095b20211e6.jpg":"chunks/c24373cf265f84e908864bb375793095b20211e6_DWM1kIEV.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/c25c0f5f8ee4aac65ae6086acebb52b490fb54f4.jpg":"chunks/c25c0f5f8ee4aac65ae6086acebb52b490fb54f4_BbcLawcG.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/c2987d9083c55b926dd658f8bb8e8aa8361121e3.jpg":"chunks/c2987d9083c55b926dd658f8bb8e8aa8361121e3_1_8JDe5E.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/c2bc707c2c7a8e936fb1d5a84d003da5e1558b8c.jpg":"chunks/c2bc707c2c7a8e936fb1d5a84d003da5e1558b8c_D0Dm6nfd.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/c2c57f6ef7d564785d666fd0740f3c842ca1b2fc.jpg":"chunks/c2c57f6ef7d564785d666fd0740f3c842ca1b2fc_DPdgQSET.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/c31aecbac0b1f6f170abf191300f3e9304a4b7c6.jpg":"chunks/c31aecbac0b1f6f170abf191300f3e9304a4b7c6_Ba5hkTwD.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/c36017fdf3ff80939ae8717fd53987834787e494.jpg":"chunks/c36017fdf3ff80939ae8717fd53987834787e494_BBqHypqG.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/c4560b4a972c130c5103f7e94b27bbaf1b43dd1a.jpg":"chunks/c4560b4a972c130c5103f7e94b27bbaf1b43dd1a_X-lrQtfh.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/c46cabff4b4046472c4905927e5fd65f77833435.jpg":"chunks/c46cabff4b4046472c4905927e5fd65f77833435_C7R8iWQr.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/c48f57a7569daca9c6f4258b6ca72d0dabe384f8.jpg":"chunks/c48f57a7569daca9c6f4258b6ca72d0dabe384f8_1VHEhLDm.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/c50daa1e522e926b9ca13e8a2d1ac3ae37b845d9.png":"chunks/c50daa1e522e926b9ca13e8a2d1ac3ae37b845d9_Cp-bTcnH.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/c514a4f748cb7da39d900e542a63155dee37c463.jpg":"chunks/c514a4f748cb7da39d900e542a63155dee37c463_BGlgbEr9.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/c569d6176667712a8f8713715a9cb816acca4b09.png":"chunks/c569d6176667712a8f8713715a9cb816acca4b09_D7rKJRwj.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/c5b3e6627738642a533f78a7a934f818512edd52.jpg":"chunks/c5b3e6627738642a533f78a7a934f818512edd52_tmAIFXtS.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/c6596e5fb28380245571e65bfdbcb1dc3ee3876c.jpg":"chunks/c6596e5fb28380245571e65bfdbcb1dc3ee3876c_C1r2TpVg.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/c6772680488f2e73d88a45fb59c5caec93456216.jpg":"chunks/c6772680488f2e73d88a45fb59c5caec93456216_CVChUGy4.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/c6b41a042fefe51101200da9a0b1cfd8e45071fd.jpg":"chunks/c6b41a042fefe51101200da9a0b1cfd8e45071fd_BbOJ3K6g.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/c733a75750a67586054ed1f631f9b960dba57f85.jpg":"chunks/c733a75750a67586054ed1f631f9b960dba57f85_DCehQ2Nn.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/c7500817ebc7837150fd10e4bb047a05beea0b5c.jpg":"chunks/c7500817ebc7837150fd10e4bb047a05beea0b5c_Blv0FJjY.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/c76b1b8391a126c356a3b7bbe92082a00e91f74d.jpg":"chunks/c76b1b8391a126c356a3b7bbe92082a00e91f74d_BYylLZ27.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/c7aa9652861e5e56048c241de3b2878a209a0e5d.jpg":"chunks/c7aa9652861e5e56048c241de3b2878a209a0e5d_bR2T2r-I.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/c7c6c242e5c8b3756d40281f0ac1ad8bafb2b972.jpg":"chunks/c7c6c242e5c8b3756d40281f0ac1ad8bafb2b972_BisyCoiX.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/c7ec1447cbcc2756b16154d7adc0fa42dd63f479.jpg":"chunks/c7ec1447cbcc2756b16154d7adc0fa42dd63f479_CI5ZVphK.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/c8091b84dd40b2663fa1802c40f7d582e8e844ef.jpg":"chunks/c8091b84dd40b2663fa1802c40f7d582e8e844ef_DswjwQjJ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/c881454591b551e9676476f27d8ce9a80d8011c6.jpg":"chunks/c881454591b551e9676476f27d8ce9a80d8011c6_D0BFSyJF.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/c96a2766daf64650c2953a1737c00a0264e8f733.jpg":"chunks/c96a2766daf64650c2953a1737c00a0264e8f733_e5gDHEMN.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/ca28e45b87c65fd0bb894b6d83430d2b23b5061b.jpg":"chunks/ca28e45b87c65fd0bb894b6d83430d2b23b5061b_e2xZgVXm.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/ca2d9cc82d29d10e6386032c1b15d80a146a20a6.jpg":"chunks/ca2d9cc82d29d10e6386032c1b15d80a146a20a6_C0OWl5qb.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/caa28f8ab28c85f1f5836d61f662366859d87510.jpg":"chunks/caa28f8ab28c85f1f5836d61f662366859d87510_DtcmW0wI.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/cb236aa5743a5aece3cbee84cdd814e24795d6b3.jpg":"chunks/cb236aa5743a5aece3cbee84cdd814e24795d6b3_Ca5tygbJ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/cb5b316d4f9caadd532e8ec12163842580f167b5.jpg":"chunks/cb5b316d4f9caadd532e8ec12163842580f167b5_M0QgfAlG.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/cb8802d4aeaaed49ba79dd1d1900402165a26f5e.jpg":"chunks/cb8802d4aeaaed49ba79dd1d1900402165a26f5e_CHB6PbVf.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/cb91fc4550ad3a73678d52b897facdcb0cf19f77.jpg":"chunks/cb91fc4550ad3a73678d52b897facdcb0cf19f77_CMWrHsk3.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/cbaa5cf951f6110834ea71853ae8fe219629a8b2.jpg":"chunks/cbaa5cf951f6110834ea71853ae8fe219629a8b2_DIKzmxEv.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/cbbdb6e7c16a1997d646d84e6ded5c6a279ac610.jpg":"chunks/cbbdb6e7c16a1997d646d84e6ded5c6a279ac610_CViivKzy.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/cbed0ca0568c4228c201f85106fb42fdeeac6183.jpg":"chunks/cbed0ca0568c4228c201f85106fb42fdeeac6183_CmCrA-Eu.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/cc1d701f4ec4bbc32988cfadc258912b949a4703.jpg":"chunks/cc1d701f4ec4bbc32988cfadc258912b949a4703_JL-h0jgC.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/cc49e6a341c4f9bc69814c830fa43b4398b3eec1.jpg":"chunks/cc49e6a341c4f9bc69814c830fa43b4398b3eec1_H7ySflcG.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/ccea9700b35b44dbdf0836ac2e9d230d077565e2.jpg":"chunks/ccea9700b35b44dbdf0836ac2e9d230d077565e2_DkH9W4Xy.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/ccfa2474d70814976856c4e60d9a0f061518a8fd.jpg":"chunks/ccfa2474d70814976856c4e60d9a0f061518a8fd_NSVELj7H.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/cd251d98b9f37818a9ea9209754cda252dbef130.jpg":"chunks/cd251d98b9f37818a9ea9209754cda252dbef130_D6S_wy-F.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/ce0efa73214d3badf4d61e50452cf513f389e2e9.jpg":"chunks/ce0efa73214d3badf4d61e50452cf513f389e2e9_sIqpbMBR.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/cef774d3cb2e92528f20f0bb563bf559fe8079f4.jpg":"chunks/cef774d3cb2e92528f20f0bb563bf559fe8079f4_hJJKqBl2.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/cf494864284b3a8dbc16c949505d4885d1dbcee5.jpg":"chunks/cf494864284b3a8dbc16c949505d4885d1dbcee5_DwfswFNN.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/cfdc0c92a00f33ca50ae583eafe69501866feae0.jpg":"chunks/cfdc0c92a00f33ca50ae583eafe69501866feae0_FUuocNGB.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/cff6e77f839563d0a328e0a2621b30ebdcff6a30.jpg":"chunks/cff6e77f839563d0a328e0a2621b30ebdcff6a30_CqqPJn3I.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/d029c85087bf6707b73b6468f53f737f106f7b10.jpg":"chunks/d029c85087bf6707b73b6468f53f737f106f7b10_Ck2p1aoo.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/d03924cc6b83f562af71408291357f6047f6343b.jpg":"chunks/d03924cc6b83f562af71408291357f6047f6343b_D7J4Hp77.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/d06b1d6b270ff11d5db1d41bbe33ad03671d2a9f.jpg":"chunks/d06b1d6b270ff11d5db1d41bbe33ad03671d2a9f_DbmEZa4P.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/d09591755f7718ed2619c976cde7752be1f84a7c.jpg":"chunks/d09591755f7718ed2619c976cde7752be1f84a7c_DvQpcLnL.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/d0f0450f0a24b0100202177e3082c8b55045d02c.jpg":"chunks/d0f0450f0a24b0100202177e3082c8b55045d02c_C7Ew-w-8.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/d1454cb09b552311130a529f27d830c93930cdc1.jpg":"chunks/d1454cb09b552311130a529f27d830c93930cdc1_XDGNSuqI.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/d170050c6d21463413ecd10ee77480b87d4e804d.jpg":"chunks/d170050c6d21463413ecd10ee77480b87d4e804d_CbpA8XOm.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/d182d78e88a7476dfc6c40655bbffd286b5780da.jpg":"chunks/d182d78e88a7476dfc6c40655bbffd286b5780da_CXoVmlo6.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/d19d168bd8fbd6676f1873bce41c50ee2ba5f504.jpg":"chunks/d19d168bd8fbd6676f1873bce41c50ee2ba5f504_DTLqqu4t.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/d1b609ebb62fa90648c41ab559b39834f4c08328.jpg":"chunks/d1b609ebb62fa90648c41ab559b39834f4c08328_D_abnEFf.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/d2b68972e1d18d7e85f8feac0f6af53796665426.png":"chunks/d2b68972e1d18d7e85f8feac0f6af53796665426_CcJD2Obn.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/d35663a7503f2f6f6c01738f3b1c63c98e0a1b69.jpg":"chunks/d35663a7503f2f6f6c01738f3b1c63c98e0a1b69_dTTA6irK.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/d35e54b5ee13f50ff6587735acf1b2ceb8e25e22.jpg":"chunks/d35e54b5ee13f50ff6587735acf1b2ceb8e25e22_C7FdkCRs.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/d3cac3c2ae2238037bc2e3864e0567b3f7264dcf.jpg":"chunks/d3cac3c2ae2238037bc2e3864e0567b3f7264dcf_COOaIMsl.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/d436dc97d59d714427237ee886c4bdadaaf85d65.png":"chunks/d436dc97d59d714427237ee886c4bdadaaf85d65_BqgjFxsL.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/d44b3c7dad41fd28ad28158821370795b4eff8fc.jpg":"chunks/d44b3c7dad41fd28ad28158821370795b4eff8fc_Bo_deVy0.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/d48ee1b6029ed25c93969baebaf9b2dccde7e7a8.jpg":"chunks/d48ee1b6029ed25c93969baebaf9b2dccde7e7a8_BwAA8scg.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/d51d3535bec306926af9d2c518a7220da7000891.jpg":"chunks/d51d3535bec306926af9d2c518a7220da7000891_BQmriwlt.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/d573741d68b378aa85e0a01c1ac67e8a5fb43e7b.jpg":"chunks/d573741d68b378aa85e0a01c1ac67e8a5fb43e7b_BLjqMn3w.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/d5a7f86c846f937ed7d3e0a6bccc59c79a168f92.jpg":"chunks/d5a7f86c846f937ed7d3e0a6bccc59c79a168f92_C9scPcMA.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/d5be2a63ebd629a68947a2b558a7e980286122af.jpg":"chunks/d5be2a63ebd629a68947a2b558a7e980286122af_YJXyXbSr.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/d5eb200f01dfd66d2eceb72fbf957909f5d92d1d.jpg":"chunks/d5eb200f01dfd66d2eceb72fbf957909f5d92d1d_CDZBKOQ9.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/d63659bae632b805c60afbc3e24b675d0cbff6ba.jpg":"chunks/d63659bae632b805c60afbc3e24b675d0cbff6ba_CzEVDI6s.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/d78b1ead586da5fe968189a7e68f38ce8c075893.jpg":"chunks/d78b1ead586da5fe968189a7e68f38ce8c075893_BSedLhzZ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/d8b918c041d762c7c348c79d66550399eefe7396.jpg":"chunks/d8b918c041d762c7c348c79d66550399eefe7396_zt5E61cQ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/d917ea376c8b435d476a7a07428af3d183cc65ec.jpg":"chunks/d917ea376c8b435d476a7a07428af3d183cc65ec_Dg417ejB.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/d92656498e2b07d1aa8aef32a22a42dbd19c8041.jpg":"chunks/d92656498e2b07d1aa8aef32a22a42dbd19c8041_BRIrPrpo.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/d967a7a4aad3e07a0109a399e87bc53ddd5bf020.jpg":"chunks/d967a7a4aad3e07a0109a399e87bc53ddd5bf020_DBmNP4it.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/d993c147c49751e810d5a2b86da7a8d3768f01d7.jpg":"chunks/d993c147c49751e810d5a2b86da7a8d3768f01d7_BDYxvo23.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/da1ee83ed23e10c3b77c7f25d6ec715c8ab6b961.jpg":"chunks/da1ee83ed23e10c3b77c7f25d6ec715c8ab6b961_5NmHzQJr.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/da7d23ed5b274e02a4f1969d7d3dba12718a0a07.jpg":"chunks/da7d23ed5b274e02a4f1969d7d3dba12718a0a07_sD8HAMbQ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/dabe21e3caea9074be8cef15149f6f470d78e9c4.jpg":"chunks/dabe21e3caea9074be8cef15149f6f470d78e9c4_DWb3EKQH.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/dac3349b50709584b7601284e4a9e93b6a473593.jpg":"chunks/dac3349b50709584b7601284e4a9e93b6a473593_C9HjbfLn.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/db05042c90f6e9c9ee231852cd95dac244634179.jpg":"chunks/db05042c90f6e9c9ee231852cd95dac244634179_B7BJgJwn.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/dbb2e5a2245fa7c7b91322bdc22f244c0800648c.jpg":"chunks/dbb2e5a2245fa7c7b91322bdc22f244c0800648c_BD4g5paq.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/dbf8a8745d94ac16e10a8924f6f0e4190d0c07ba.jpg":"chunks/dbf8a8745d94ac16e10a8924f6f0e4190d0c07ba_DCLYYLCD.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/dc0f86206eb5b745de5e61034b5e75fc6b6e2250.jpg":"chunks/dc0f86206eb5b745de5e61034b5e75fc6b6e2250_DKxk4EcO.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/dc22972b6b7943414fca5e81e2aa5def3348ca0c.jpg":"chunks/dc22972b6b7943414fca5e81e2aa5def3348ca0c_B-m6jO0p.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/dc6d948d97a5d1a5bc81fa362fe9055321b75764.jpg":"chunks/dc6d948d97a5d1a5bc81fa362fe9055321b75764_CSlNRDmM.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/dc8a57ae9a56c24a024fbb23b53a5671618107ea.jpg":"chunks/dc8a57ae9a56c24a024fbb23b53a5671618107ea_Bc3eCn5W.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/de31826451b032d854dc39b8718d71b8a60f4f69.jpg":"chunks/de31826451b032d854dc39b8718d71b8a60f4f69_C_CLgKzi.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/de4bf2c77a2e2487c7ed2f48e79c1c8c91b698ca.jpg":"chunks/de4bf2c77a2e2487c7ed2f48e79c1c8c91b698ca_iVM8CM_E.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/dec95c1946ac7ff07c9d2ebcf7488b022d06240d.jpg":"chunks/dec95c1946ac7ff07c9d2ebcf7488b022d06240d_MEp5hF3j.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/df86a066b73ff33e48f2a663ceb226c6a8598574.jpg":"chunks/df86a066b73ff33e48f2a663ceb226c6a8598574_CC1f47XZ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/e0c9346749b2d26e6cbed3387c08680729971d69.jpg":"chunks/e0c9346749b2d26e6cbed3387c08680729971d69_BXgw6JUG.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/e0ca2c44c2c22f3f9a03f59a027ddff2fffc2bcf.jpg":"chunks/e0ca2c44c2c22f3f9a03f59a027ddff2fffc2bcf_B3npop9r.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/e0f3fa68dc57b01ddd1fda277fe2268ac362b99a.jpg":"chunks/e0f3fa68dc57b01ddd1fda277fe2268ac362b99a_Bo0pwzIr.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/e10726ae7c3c85f9b0e574609a3ae068e4b0b7a9.jpg":"chunks/e10726ae7c3c85f9b0e574609a3ae068e4b0b7a9_zE9Bw25d.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/e109f8a1923f0b34645caa9772021de4dc9f8c4f.jpg":"chunks/e109f8a1923f0b34645caa9772021de4dc9f8c4f_CygBVY7l.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/e17a41b2925cc5a9d26a35116a208b53c53b55f1.jpg":"chunks/e17a41b2925cc5a9d26a35116a208b53c53b55f1_CIk5m29V.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/e18a21a96a7e4af64d495a8d3e5f734933063aa6.jpg":"chunks/e18a21a96a7e4af64d495a8d3e5f734933063aa6_W2StkHal.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/e1e611863a57f74ace574756826ad30c0bee83d1.jpg":"chunks/e1e611863a57f74ace574756826ad30c0bee83d1_CeCZXqSM.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/e1f56d11cf689827f25d70f1685f711c523facd6.jpg":"chunks/e1f56d11cf689827f25d70f1685f711c523facd6_D_PD1sh5.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/e228b644fdcd45d6635b8405de33d03726a9de7e.jpg":"chunks/e228b644fdcd45d6635b8405de33d03726a9de7e_GNZkjOSa.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/e291bbcbbab45ae036172d1c205cddf1091e4bc4.jpg":"chunks/e291bbcbbab45ae036172d1c205cddf1091e4bc4_Cj_I-tCw.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/e2a68b83472b3e7fbd95b7892a1c0854c5aafee6.jpg":"chunks/e2a68b83472b3e7fbd95b7892a1c0854c5aafee6_oxzU7WSn.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/e2cf22a86d996f4232954cebe740bd4530634f8e.jpg":"chunks/e2cf22a86d996f4232954cebe740bd4530634f8e_P-vTqbAy.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/e3125d4774daebb7a824922d9a214e976741a901.jpg":"chunks/e3125d4774daebb7a824922d9a214e976741a901_C0s4pRft.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/e371e2851167346c40aa6f88be62a7a824e8da72.jpg":"chunks/e371e2851167346c40aa6f88be62a7a824e8da72_bm_0NyBo.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/e39bdf39234e180fc80e145920594137aeeee53a.jpg":"chunks/e39bdf39234e180fc80e145920594137aeeee53a_CMeqPP0Z.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/e45921360898593cd5f73509dde7e0131302da53.jpg":"chunks/e45921360898593cd5f73509dde7e0131302da53_2JrKgt5y.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/e47e7c40045decc89e0ac1d9f290ae49ed8c685c.jpg":"chunks/e47e7c40045decc89e0ac1d9f290ae49ed8c685c_lu0KlrdG.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/e4a1a641f51392537429c304be88b9ccf9887cdd.jpg":"chunks/e4a1a641f51392537429c304be88b9ccf9887cdd_BWrR09ik.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/e4a1c9a0d59096004614bed943bfb93a2de9600f.jpg":"chunks/e4a1c9a0d59096004614bed943bfb93a2de9600f_-Dksprr1.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/e5a6dd19ae502fb8386ba62703665982fb20c466.jpg":"chunks/e5a6dd19ae502fb8386ba62703665982fb20c466_BTEbJS9v.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/e611fc9637d25ebc4c91acd392671c574d8d2ed8.jpg":"chunks/e611fc9637d25ebc4c91acd392671c574d8d2ed8_Dx8VvbsF.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/e6c23572d73fc17c258845f08dce4bf615c5a8aa.png":"chunks/e6c23572d73fc17c258845f08dce4bf615c5a8aa_BdgdznWf.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/e6eb7f5d4a48e4dda15c52f48059bc91d4e8c259.jpg":"chunks/e6eb7f5d4a48e4dda15c52f48059bc91d4e8c259_CXWkmipS.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/e75d411bd8a8dbd16f648f3a3e7015c0b5a0f1b3.jpg":"chunks/e75d411bd8a8dbd16f648f3a3e7015c0b5a0f1b3_DbLFKPc0.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/e75e2bfabcf8b0c1c53dbf7e6c39a9bc631e8087.jpg":"chunks/e75e2bfabcf8b0c1c53dbf7e6c39a9bc631e8087_ZElXqZlz.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/e78494c6a4b753ff49cfacf80eb78883e76fe1e0.jpg":"chunks/e78494c6a4b753ff49cfacf80eb78883e76fe1e0_1tBYl6YF.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/e78ba563dc5fbe4a9bc9b8682968407b4e3fea42.jpg":"chunks/e78ba563dc5fbe4a9bc9b8682968407b4e3fea42_DevfHuVb.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/e7a272215d303e2ded6436f0cd805a1a2f8e79f2.jpg":"chunks/e7a272215d303e2ded6436f0cd805a1a2f8e79f2_X4KCJPMs.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/e7a8b6a517ec0ecf13b1f86e74e4523442c3c826.jpg":"chunks/e7a8b6a517ec0ecf13b1f86e74e4523442c3c826_CTUJI1nf.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/e7c84348e9087f43a300ece3f0663592acaf83cf.jpg":"chunks/e7c84348e9087f43a300ece3f0663592acaf83cf_D_p4Ml7z.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/e7d659feae08e4c913888138779afd1a8d43d8b8.jpg":"chunks/e7d659feae08e4c913888138779afd1a8d43d8b8_CL-os0eF.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/e7d761e9c5bce7018872ae4ac22a0ffc50fb366e.jpg":"chunks/e7d761e9c5bce7018872ae4ac22a0ffc50fb366e_GcTfZkXS.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/e7e0d0136e6425dc1bd12d01673caf6a1a267594.png":"chunks/e7e0d0136e6425dc1bd12d01673caf6a1a267594_DJh1CJf8.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/e7fb2269bfac1174c17e69d6be099666ad49eb88.jpg":"chunks/e7fb2269bfac1174c17e69d6be099666ad49eb88_DgvlNjQ2.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/e80a26c521dbea9a00faba77d37e713c655709cb.jpg":"chunks/e80a26c521dbea9a00faba77d37e713c655709cb_opfp00Ge.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/e8280bb3810110b98b559e0a5a7d3acd988f5ee4.jpg":"chunks/e8280bb3810110b98b559e0a5a7d3acd988f5ee4_kcvN_0RB.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/e83ac5160e6e61c077f7fbdbc5e24d9365129842.jpg":"chunks/e83ac5160e6e61c077f7fbdbc5e24d9365129842_-V83vTXJ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/e8408b30199e775b843c5546847b88e9036410b1.jpg":"chunks/e8408b30199e775b843c5546847b88e9036410b1_CDOw9RpU.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/e84ad1381b7702fbc8bb7f509345b9e05cf97368.jpg":"chunks/e84ad1381b7702fbc8bb7f509345b9e05cf97368_Czemtkvb.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/e85e67ac5c9d55d1efbd0ed6969339cfb462bcde.jpg":"chunks/e85e67ac5c9d55d1efbd0ed6969339cfb462bcde_D4yzuODB.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/e897af2e044623db9f7a1e97d33c8c3d7a66c3f2.jpg":"chunks/e897af2e044623db9f7a1e97d33c8c3d7a66c3f2_Gbf5TwNJ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/e908ebff8b169f13c6638920f95d64c074ac494e.jpg":"chunks/e908ebff8b169f13c6638920f95d64c074ac494e_DAf8-wq6.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/e96fd067f9a5106e8418416b14b664481a649717.jpg":"chunks/e96fd067f9a5106e8418416b14b664481a649717_B30MVpsL.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/e9f4cc197d26efe47375ff43125729771ae403ab.jpg":"chunks/e9f4cc197d26efe47375ff43125729771ae403ab_DGAu-dwl.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/ea3c1555a83f67839ef4bc1bc124f9eaff42a2fa.jpg":"chunks/ea3c1555a83f67839ef4bc1bc124f9eaff42a2fa_B4JJi4NG.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/easing-back-into-it-via-915-s-grand-view-01.webp":"chunks/easing-back-into-it-via-915-s-grand-view-01_UBBqTDSP.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/easing-back-into-it-via-915-s-grand-view-02.webp":"chunks/easing-back-into-it-via-915-s-grand-view-02_suJDM9Ga.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/easing-back-into-it-via-915-s-grand-view-03.webp":"chunks/easing-back-into-it-via-915-s-grand-view-03_DpJPVhWW.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/eb1f06977ed54ce402a673184c8444a1ea3f0668.jpg":"chunks/eb1f06977ed54ce402a673184c8444a1ea3f0668_CVDM6vUA.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/eb4c93bbab869f70ffa7caef7161c4f590b6985a.jpg":"chunks/eb4c93bbab869f70ffa7caef7161c4f590b6985a_D835KgwD.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/eb70265f95dad5ebc5aafdf9ee116518c30193f4.jpg":"chunks/eb70265f95dad5ebc5aafdf9ee116518c30193f4_grXlxhU0.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/eb8b21f871168c35c597a9b4a814d89399e6a9ed.jpg":"chunks/eb8b21f871168c35c597a9b4a814d89399e6a9ed_D67eKsfz.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/ebe0883dd0327385dd36c1a8a7ba7d115a266f44.jpg":"chunks/ebe0883dd0327385dd36c1a8a7ba7d115a266f44_QRJOQO8J.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/ec0c1ea0b432f66a014464c68308222557a36150.jpg":"chunks/ec0c1ea0b432f66a014464c68308222557a36150_9CpGL2Q4.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/ec3fc9ce1a386fb71326ca77c97ed3a290eb0677.jpg":"chunks/ec3fc9ce1a386fb71326ca77c97ed3a290eb0677_BXWTXpGf.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/ecd489e63560ae00ebf68be2a90756189bcec0ad.jpg":"chunks/ecd489e63560ae00ebf68be2a90756189bcec0ad_DybkgV1W.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/ed506f86d5eaa43d07d55276e47c37bc727792b5.jpg":"chunks/ed506f86d5eaa43d07d55276e47c37bc727792b5_B2i-oSmM.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/eeae1ef11de1cbcd66fd5a526d43e976dc558961.jpg":"chunks/eeae1ef11de1cbcd66fd5a526d43e976dc558961_Du92gRxb.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/ef6aab5d51016866686e6e403994f0c64426c8d2.jpg":"chunks/ef6aab5d51016866686e6e403994f0c64426c8d2_BVDIAxGl.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/ef862e408adf547ea1b00af405f5740fceb8e1f5.jpg":"chunks/ef862e408adf547ea1b00af405f5740fceb8e1f5_xbE_OX3n.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/ef99e9d6cd0866a0a6b8ed26a000e7bf0db6e21f.jpg":"chunks/ef99e9d6cd0866a0a6b8ed26a000e7bf0db6e21f_CUKJD8rE.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/efa2daffe754b31b3376af7f6ba128367450ad1d.jpg":"chunks/efa2daffe754b31b3376af7f6ba128367450ad1d_DHSgZMVo.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/f13e005bfe8fcc37d12e133d743ad8b9f3298dd4.jpg":"chunks/f13e005bfe8fcc37d12e133d743ad8b9f3298dd4_D7KC3bUo.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/f15f90fe842f1a28b46cc6e8f2429e619863d065.png":"chunks/f15f90fe842f1a28b46cc6e8f2429e619863d065_LOMm0HfO.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/f1cd484e45944229e33888865ac9a90fd4c18c06.jpg":"chunks/f1cd484e45944229e33888865ac9a90fd4c18c06_CU5Tg2yo.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/f1d89320b8c523457b81c874731b4d11299d6a48.jpg":"chunks/f1d89320b8c523457b81c874731b4d11299d6a48_Cej3-EAW.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/f1f5b9e5012fe2d7d5b426f707f49e35e2be325d.jpg":"chunks/f1f5b9e5012fe2d7d5b426f707f49e35e2be325d_C2kkFKwg.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/f2b8916a102f479a41ed824d5846e74ba8e27d9f.jpg":"chunks/f2b8916a102f479a41ed824d5846e74ba8e27d9f_BdU4FDz4.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/f2dc1e71a18f6a3763856173d3f9fbaa657da65a.jpg":"chunks/f2dc1e71a18f6a3763856173d3f9fbaa657da65a_rqWwxDWJ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/f351609df81fa7a0701c17205b39152c283ac70a.png":"chunks/f351609df81fa7a0701c17205b39152c283ac70a_CT46Hwnh.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/f38883fcfdc0315c106ece47592c3cc28343bd69.jpg":"chunks/f38883fcfdc0315c106ece47592c3cc28343bd69_Ba2NKY2-.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/f3c9a5fc732d4b76a9c2a2657a3917f583d23519.jpg":"chunks/f3c9a5fc732d4b76a9c2a2657a3917f583d23519_BbKGo3b_.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/f47955c85f94ff265c560ee211d06c5354bc92fc.jpg":"chunks/f47955c85f94ff265c560ee211d06c5354bc92fc_Dtxh95DC.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/f53b589eb605fc94bbb398fef6afb05f6b804167.jpg":"chunks/f53b589eb605fc94bbb398fef6afb05f6b804167_C_ErJA_o.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/f60164c97d55e7f2d3ba891424b61891b05cb433.jpg":"chunks/f60164c97d55e7f2d3ba891424b61891b05cb433_C98xpUnb.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/f623e6bc90f9ee3fc59a9996452749323ef5e01a.jpg":"chunks/f623e6bc90f9ee3fc59a9996452749323ef5e01a_BO9PBpmo.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/f8310483e7e0525fb66024d7dac6fd4498131bd2.jpg":"chunks/f8310483e7e0525fb66024d7dac6fd4498131bd2_DkSbRZIJ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/f8823f7203f3242c0cd572a54748ff1931f00155.jpg":"chunks/f8823f7203f3242c0cd572a54748ff1931f00155_DFhpMyIr.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/f9a8f8c0f054b457d92619f3c05d1c751cea0cea.jpg":"chunks/f9a8f8c0f054b457d92619f3c05d1c751cea0cea_BLLki4n9.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/f9cc42f9c624a777eac2e0afff6f1254f22c186c.jpg":"chunks/f9cc42f9c624a777eac2e0afff6f1254f22c186c_BdKtUmN1.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/fb15b8b642cf7fece343cab069684986bde1daac.jpg":"chunks/fb15b8b642cf7fece343cab069684986bde1daac_DStXX3Yj.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/fb610e7a1507a5fb73b6d9163054930781b33fa4.jpg":"chunks/fb610e7a1507a5fb73b6d9163054930781b33fa4_Dyvg5ZI-.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/fb9abb67754ce5bc74057c9f84a1c30d2aef3e56.jpg":"chunks/fb9abb67754ce5bc74057c9f84a1c30d2aef3e56_Du8TKMXF.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/fbbbfa84adbe6872d252f95b744060ad3960c273.jpg":"chunks/fbbbfa84adbe6872d252f95b744060ad3960c273_ubaYwRdr.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/fc01b39ada4a81990d061e142e56d30bde1f6370.jpg":"chunks/fc01b39ada4a81990d061e142e56d30bde1f6370_c4uwZaJk.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/fd178daf94d65b76fcc3665afefbe01b735c2f95.jpg":"chunks/fd178daf94d65b76fcc3665afefbe01b735c2f95_CbyBBbUP.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/fd4d68bb82a6fd3f3184eb2fff1290835109a4ee.jpg":"chunks/fd4d68bb82a6fd3f3184eb2fff1290835109a4ee_DlQdolB-.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/fe57128ded5b2a25fee8ad3cf533d38bd53d4642.jpg":"chunks/fe57128ded5b2a25fee8ad3cf533d38bd53d4642_rId75y0L.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/fe67bc4ff5c711a58afb67fc06144568a41f5cc9.jpg":"chunks/fe67bc4ff5c711a58afb67fc06144568a41f5cc9_DTcQCPtK.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/fec9b211566ed244604d303c8e8fb912d109feb1.jpg":"chunks/fec9b211566ed244604d303c8e8fb912d109feb1_C4FFmcxi.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/feef000d17dea0a91fac862e045643d212510e59.jpg":"chunks/feef000d17dea0a91fac862e045643d212510e59_C7oYlS_K.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/ff7d8392e8e4707a78a5e4196f7048b2cb724124.jpg":"chunks/ff7d8392e8e4707a78a5e4196f7048b2cb724124_BSJ1ylsY.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/fire-on-east-fourth-01.webp":"chunks/fire-on-east-fourth-01_PzF-NRxx.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/fire-on-east-fourth-02.webp":"chunks/fire-on-east-fourth-02_DZl__9NJ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/fire-on-east-fourth-03.webp":"chunks/fire-on-east-fourth-03_DhCca7jk.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/fire-on-east-fourth-04.webp":"chunks/fire-on-east-fourth-04_BFOUIyYs.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/fire-on-east-fourth-05.webp":"chunks/fire-on-east-fourth-05_V9zRnMaV.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/fire-on-east-fourth-06.webp":"chunks/fire-on-east-fourth-06_D1o1FRSN.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/fire-on-east-fourth-07.webp":"chunks/fire-on-east-fourth-07_BZ7Fq44q.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/fire-on-east-fourth-08.webp":"chunks/fire-on-east-fourth-08_DKR6kx6M.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/fire-on-east-fourth-09.webp":"chunks/fire-on-east-fourth-09_B3D7_oSN.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/fire-on-east-fourth-10.webp":"chunks/fire-on-east-fourth-10_Kc-wNGe7.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/greetings-01.webp":"chunks/greetings-01_hRIKLxQx.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/greetings-02.webp":"chunks/greetings-02_9vbi2dFe.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/isr-test-01.webp":"chunks/isr-test-01_eHT2ydno.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/isr-test-02.webp":"chunks/isr-test-02_DNRI0ovw.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/isr-test-03.webp":"chunks/isr-test-03_UVjtOtOJ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/la-cienega-motel-1725-so-la-cienega-01.webp":"chunks/la-cienega-motel-1725-so-la-cienega-01_CktLgSS9.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/la-cienega-motel-1725-so-la-cienega-02.webp":"chunks/la-cienega-motel-1725-so-la-cienega-02_CgSd8tXm.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/la-cienega-motel-1725-so-la-cienega-03.webp":"chunks/la-cienega-motel-1725-so-la-cienega-03_BYVVNM2p.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/la-cienega-motel-1725-so-la-cienega-04.webp":"chunks/la-cienega-motel-1725-so-la-cienega-04_dVSomiHe.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/la-cienega-motel-1725-so-la-cienega-05.webp":"chunks/la-cienega-motel-1725-so-la-cienega-05_B4KAvfGn.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/la-cienega-motel-1725-so-la-cienega-06.webp":"chunks/la-cienega-motel-1725-so-la-cienega-06_C1kkOfl3.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/la-cienega-motel-1725-so-la-cienega-07.webp":"chunks/la-cienega-motel-1725-so-la-cienega-07_DbVwsCUd.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/la-cienega-motel-1725-so-la-cienega-08.webp":"chunks/la-cienega-motel-1725-so-la-cienega-08_B4Npe6NP.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/la-cienega-motel-1725-so-la-cienega-09.webp":"chunks/la-cienega-motel-1725-so-la-cienega-09_DZVaf0PG.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/la-cienega-motel-1725-so-la-cienega-10.webp":"chunks/la-cienega-motel-1725-so-la-cienega-10_1WSC8rak.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/la-cienega-motel-1725-so-la-cienega-11.webp":"chunks/la-cienega-motel-1725-so-la-cienega-11_DGR1pI3_.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/la-cienega-motel-1725-so-la-cienega-12.webp":"chunks/la-cienega-motel-1725-so-la-cienega-12_BShI_ZT_.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/la-cienega-motel-1725-so-la-cienega-13.webp":"chunks/la-cienega-motel-1725-so-la-cienega-13_CW9k5o9-.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/la-cienega-motel-1725-so-la-cienega-14.webp":"chunks/la-cienega-motel-1725-so-la-cienega-14_ButnoAJ2.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/la-cienega-motel-1725-so-la-cienega-15.webp":"chunks/la-cienega-motel-1725-so-la-cienega-15_CXvhnUm8.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/la-cienega-motel-1725-so-la-cienega-16.webp":"chunks/la-cienega-motel-1725-so-la-cienega-16_C6D3hPZf.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/la-cienega-motel-1725-so-la-cienega-17.webp":"chunks/la-cienega-motel-1725-so-la-cienega-17_KmoZRxun.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/let-s-talk-about-taix-01.webp":"chunks/let-s-talk-about-taix-01_qGRr6OPv.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/let-s-talk-about-taix-02.webp":"chunks/let-s-talk-about-taix-02_D3EjCahK.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/let-s-talk-about-taix-03.webp":"chunks/let-s-talk-about-taix-03_Cs-kxXID.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/let-s-talk-about-taix-04.webp":"chunks/let-s-talk-about-taix-04_DYubrsKQ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/let-s-talk-about-taix-05.webp":"chunks/let-s-talk-about-taix-05_BJ3P5UhJ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/let-s-talk-about-taix-06.webp":"chunks/let-s-talk-about-taix-06_DZuPKwVw.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/let-s-talk-about-taix-07.webp":"chunks/let-s-talk-about-taix-07_BWyGQDXo.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/let-s-talk-about-taix-08.webp":"chunks/let-s-talk-about-taix-08_aC7chdA1.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/let-s-talk-about-taix-09.webp":"chunks/let-s-talk-about-taix-09_BJ9Q2ZDo.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/let-s-talk-about-taix-10.webp":"chunks/let-s-talk-about-taix-10_DlZnVRqt.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/let-s-talk-about-taix-11.webp":"chunks/let-s-talk-about-taix-11_CbFM1xqA.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/let-s-talk-about-taix-12.webp":"chunks/let-s-talk-about-taix-12_E3nYr52x.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/let-s-talk-about-taix-13.webp":"chunks/let-s-talk-about-taix-13_Dj0g7ESH.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/let-s-talk-about-taix-14.webp":"chunks/let-s-talk-about-taix-14_LQaGwO4d.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/let-s-talk-about-taix-15.webp":"chunks/let-s-talk-about-taix-15_wtOt3jPU.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/let-s-talk-about-taix-16.webp":"chunks/let-s-talk-about-taix-16_CbiLNm-V.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/let-s-talk-about-taix-17.webp":"chunks/let-s-talk-about-taix-17_DKm1MIDK.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/magnolia-update-01.webp":"chunks/magnolia-update-01_BvbIui2e.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/magnolia-update-02.webp":"chunks/magnolia-update-02_8lg1DJgw.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/magnolia-update-03.webp":"chunks/magnolia-update-03_BhWzw-2B.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/magnolia-update-04.webp":"chunks/magnolia-update-04_DmNhCxPT.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/magnolia-update-05.webp":"chunks/magnolia-update-05_D7pJAtto.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/marilyn-s-house-01.webp":"chunks/marilyn-s-house-01_BVb8qtdr.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/marilyn-s-house-02.webp":"chunks/marilyn-s-house-02_UZk5Iepg.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/marilyn-s-house-03.webp":"chunks/marilyn-s-house-03_Br5y3fUN.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/marilyn-s-house-04.webp":"chunks/marilyn-s-house-04_BwnT96WK.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/marilyn-s-house-05.webp":"chunks/marilyn-s-house-05_CTrD1nSl.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/marilyn-s-house-06.webp":"chunks/marilyn-s-house-06_DZiN3oCi.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/marilyn-s-house-07.webp":"chunks/marilyn-s-house-07_CrcPXe7k.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/marilyn-s-house-08.webp":"chunks/marilyn-s-house-08_Cs4ACUpY.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/marilyn-s-house-09.webp":"chunks/marilyn-s-house-09_B3FR8osc.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/marilyn-s-house-10.webp":"chunks/marilyn-s-house-10_B0IKc77O.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/marilyn-s-house-11.webp":"chunks/marilyn-s-house-11_Cl-Sw-fM.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/marilyn-s-house-12.webp":"chunks/marilyn-s-house-12_giaCEm_a.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/marilyn-s-house-13.webp":"chunks/marilyn-s-house-13_B27kllnV.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/marilyn-s-house-14.webp":"chunks/marilyn-s-house-14_9E8Rj30H.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/meet-553-north-heliotrope-01.webp":"chunks/meet-553-north-heliotrope-01_CYQQcXbO.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/meet-553-north-heliotrope-02.webp":"chunks/meet-553-north-heliotrope-02_B467wj3a.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/meet-553-north-heliotrope-03.webp":"chunks/meet-553-north-heliotrope-03_MafcHtcR.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/meet-553-north-heliotrope-04.webp":"chunks/meet-553-north-heliotrope-04_-aO1RUdn.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/meet-553-north-heliotrope-05.webp":"chunks/meet-553-north-heliotrope-05_Cu8xn7LO.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/old-glendale-01.webp":"chunks/old-glendale-01_CxZ8wbmH.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/old-glendale-02.webp":"chunks/old-glendale-02_8aXzoQ2b.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/old-glendale-03.webp":"chunks/old-glendale-03_DH3n3OXL.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/on-another-note-01.webp":"chunks/on-another-note-01_90loW66i.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/on-another-note-02.webp":"chunks/on-another-note-02_BP7w2pms.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/on-another-note-03.webp":"chunks/on-another-note-03_DsfsL-P1.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/orion-housing-even-worse-01.webp":"chunks/orion-housing-even-worse-01_DOigAyCd.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/orion-housing-even-worse-02.webp":"chunks/orion-housing-even-worse-02_saJm7ci7.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/orion-housing-even-worse-03.webp":"chunks/orion-housing-even-worse-03_Dw69xSkg.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/orion-housing-even-worse-04.webp":"chunks/orion-housing-even-worse-04_CGPrzrGm.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/orion-housing-even-worse-05.webp":"chunks/orion-housing-even-worse-05_DYu5tE3P.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/orion-housing-even-worse-06.webp":"chunks/orion-housing-even-worse-06_Ks3Qrg7e.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/orion-housing-even-worse-07.webp":"chunks/orion-housing-even-worse-07_tFew5RMV.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/orion-housing-even-worse-08.webp":"chunks/orion-housing-even-worse-08_BusJfGM8.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/orion-housing-even-worse-09.webp":"chunks/orion-housing-even-worse-09_CoIt9brq.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/orion-housing-even-worse-10.webp":"chunks/orion-housing-even-worse-10_DyC6mxZW.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/orion-housing-even-worse-11.webp":"chunks/orion-housing-even-worse-11_CbQSYpdL.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/orion-housing-even-worse-12.webp":"chunks/orion-housing-even-worse-12_DtfuJvIK.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/orion-housing-even-worse-13.webp":"chunks/orion-housing-even-worse-13_DApz03RB.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/orion-housing-even-worse-14.webp":"chunks/orion-housing-even-worse-14_BZW-s-bG.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/orion-housing-even-worse-15.webp":"chunks/orion-housing-even-worse-15_CEVYrYK-.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/orion-housing-even-worse-16.webp":"chunks/orion-housing-even-worse-16_BgdQRfpU.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/orion-housing-even-worse-17.webp":"chunks/orion-housing-even-worse-17_J0ciKRoN.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/orion-housing-even-worse-18.webp":"chunks/orion-housing-even-worse-18_Ba3ZwB_7.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/orion-housing-even-worse-19.webp":"chunks/orion-housing-even-worse-19_CJ0HvxmE.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/orion-housing-even-worse-20.webp":"chunks/orion-housing-even-worse-20_Bb3FusMq.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/orion-housing-even-worse-21.webp":"chunks/orion-housing-even-worse-21_DDzYGtLl.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/orion-housing-even-worse-22.webp":"chunks/orion-housing-even-worse-22_DU_T0jaO.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/orion-housing-even-worse-23.webp":"chunks/orion-housing-even-worse-23_D1-BD0wY.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/orion-housing-even-worse-24.webp":"chunks/orion-housing-even-worse-24_DpcmN-3I.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/pacific-bowling-center-dancing-waters-club-1331-s-pacific-ave-01.webp":"chunks/pacific-bowling-center-dancing-waters-club-1331-s-pacific-ave-01_DR577Jub.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/pacific-bowling-center-dancing-waters-club-1331-s-pacific-ave-02.webp":"chunks/pacific-bowling-center-dancing-waters-club-1331-s-pacific-ave-02_CETmHHwn.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/pacific-bowling-center-dancing-waters-club-1331-s-pacific-ave-03.webp":"chunks/pacific-bowling-center-dancing-waters-club-1331-s-pacific-ave-03_lxjr-AW_.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/pacific-bowling-center-dancing-waters-club-1331-s-pacific-ave-04.webp":"chunks/pacific-bowling-center-dancing-waters-club-1331-s-pacific-ave-04_JWgD4PHd.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/pacific-bowling-center-dancing-waters-club-1331-s-pacific-ave-05.webp":"chunks/pacific-bowling-center-dancing-waters-club-1331-s-pacific-ave-05_V35_JN7L.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/pacific-bowling-center-dancing-waters-club-1331-s-pacific-ave-06.webp":"chunks/pacific-bowling-center-dancing-waters-club-1331-s-pacific-ave-06_BqweDREi.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/pacific-bowling-center-dancing-waters-club-1331-s-pacific-ave-07.webp":"chunks/pacific-bowling-center-dancing-waters-club-1331-s-pacific-ave-07_BmCH25lm.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/pacific-bowling-center-dancing-waters-club-1331-s-pacific-ave-08.webp":"chunks/pacific-bowling-center-dancing-waters-club-1331-s-pacific-ave-08_DRPG3QTz.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/pacific-bowling-center-dancing-waters-club-1331-s-pacific-ave-09.webp":"chunks/pacific-bowling-center-dancing-waters-club-1331-s-pacific-ave-09_CO1CU-aY.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/pacific-bowling-center-dancing-waters-club-1331-s-pacific-ave-10.webp":"chunks/pacific-bowling-center-dancing-waters-club-1331-s-pacific-ave-10_CQ_AM_Mt.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/pacific-bowling-center-dancing-waters-club-1331-s-pacific-ave-11.webp":"chunks/pacific-bowling-center-dancing-waters-club-1331-s-pacific-ave-11_CQ9FQVAa.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/pacific-bowling-center-dancing-waters-club-1331-s-pacific-ave-12.webp":"chunks/pacific-bowling-center-dancing-waters-club-1331-s-pacific-ave-12_YOyGvxZp.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/pacific-bowling-center-dancing-waters-club-1331-s-pacific-ave-13.webp":"chunks/pacific-bowling-center-dancing-waters-club-1331-s-pacific-ave-13_Dj8H_g0s.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/pacific-bowling-center-dancing-waters-club-1331-s-pacific-ave-14.webp":"chunks/pacific-bowling-center-dancing-waters-club-1331-s-pacific-ave-14_CqUjogJC.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/pacific-bowling-center-dancing-waters-club-1331-s-pacific-ave-15.webp":"chunks/pacific-bowling-center-dancing-waters-club-1331-s-pacific-ave-15_DMfhFII9.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/pacific-bowling-center-dancing-waters-club-1331-s-pacific-ave-16.webp":"chunks/pacific-bowling-center-dancing-waters-club-1331-s-pacific-ave-16_DA06o-Km.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/pacific-bowling-center-dancing-waters-club-1331-s-pacific-ave-17.webp":"chunks/pacific-bowling-center-dancing-waters-club-1331-s-pacific-ave-17_Yia0nWd1.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/remembering-santa-monica-01.webp":"chunks/remembering-santa-monica-01_BHTiuTi1.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/remembering-santa-monica-02.webp":"chunks/remembering-santa-monica-02_yNKNiHzV.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/remembering-santa-monica-03.webp":"chunks/remembering-santa-monica-03_zkXf0vRZ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/remembering-santa-monica-04.webp":"chunks/remembering-santa-monica-04_DCM52b29.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/remembering-santa-monica-05.webp":"chunks/remembering-santa-monica-05_D23syuqR.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/remembering-santa-monica-06.webp":"chunks/remembering-santa-monica-06_BPfCI_zK.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/say-goodbye-to-old-westwood-01.webp":"chunks/say-goodbye-to-old-westwood-01_Ca5N7JuC.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/say-goodbye-to-old-westwood-02.webp":"chunks/say-goodbye-to-old-westwood-02_Ca_-P-zt.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/say-goodbye-to-old-westwood-03.webp":"chunks/say-goodbye-to-old-westwood-03_BcVF5S1t.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/say-goodbye-to-old-westwood-04.webp":"chunks/say-goodbye-to-old-westwood-04_BfeZVPu5.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/say-goodbye-to-old-westwood-05.webp":"chunks/say-goodbye-to-old-westwood-05_DEw_owKR.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/say-goodbye-to-old-westwood-06.webp":"chunks/say-goodbye-to-old-westwood-06_x-frgA-a.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/say-goodbye-to-old-westwood-07.webp":"chunks/say-goodbye-to-old-westwood-07_BqqFvtO9.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/say-goodbye-to-old-westwood-08.webp":"chunks/say-goodbye-to-old-westwood-08_5SAf9lJg.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/taix-and-the-city-01.webp":"chunks/taix-and-the-city-01_y7fA5pn4.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/taix-and-the-city-02.webp":"chunks/taix-and-the-city-02_NKlj0PE8.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/taix-and-the-city-03.webp":"chunks/taix-and-the-city-03_Cz3XmL2H.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/taix-and-the-city-04.webp":"chunks/taix-and-the-city-04_XuV6hVsC.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-bungalows-of-hyde-park-must-be-sacrificed-01.webp":"chunks/the-bungalows-of-hyde-park-must-be-sacrificed-01_CHP3uIas.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-bungalows-of-hyde-park-must-be-sacrificed-02.webp":"chunks/the-bungalows-of-hyde-park-must-be-sacrificed-02_C_mFHOPB.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-bungalows-of-hyde-park-must-be-sacrificed-03.webp":"chunks/the-bungalows-of-hyde-park-must-be-sacrificed-03_qAjxcNq-.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-bungalows-of-hyde-park-must-be-sacrificed-04.webp":"chunks/the-bungalows-of-hyde-park-must-be-sacrificed-04_B34P0GM3.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-bungalows-of-hyde-park-must-be-sacrificed-05.webp":"chunks/the-bungalows-of-hyde-park-must-be-sacrificed-05_DiAtoQyq.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-bungalows-of-hyde-park-must-be-sacrificed-06.webp":"chunks/the-bungalows-of-hyde-park-must-be-sacrificed-06_Dw8gY8NC.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-bungalows-of-hyde-park-must-be-sacrificed-07.webp":"chunks/the-bungalows-of-hyde-park-must-be-sacrificed-07_qes3zVDj.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-cecil-is-the-city-s-fault-01.webp":"chunks/the-cecil-is-the-city-s-fault-01_VEG4dhBn.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-cecil-is-the-city-s-fault-02.webp":"chunks/the-cecil-is-the-city-s-fault-02_DtOyJdTb.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-cecil-is-the-city-s-fault-03.webp":"chunks/the-cecil-is-the-city-s-fault-03_CxDoeRrP.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-cecil-is-the-city-s-fault-04.webp":"chunks/the-cecil-is-the-city-s-fault-04_CUxF_NwK.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-cecil-is-the-city-s-fault-05.webp":"chunks/the-cecil-is-the-city-s-fault-05_F5QEv602.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-cecil-is-the-city-s-fault-06.webp":"chunks/the-cecil-is-the-city-s-fault-06_Dl_HA8f9.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-cecil-is-the-city-s-fault-07.webp":"chunks/the-cecil-is-the-city-s-fault-07_DHjbEMzV.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-cecil-is-the-city-s-fault-08.webp":"chunks/the-cecil-is-the-city-s-fault-08__maNdo9q.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-cecil-s-ghost-01.webp":"chunks/the-cecil-s-ghost-01_DWn5G4dV.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-cranky-preservationist-3-beauties-bite-the-dust-episode-20-01.webp":"chunks/the-cranky-preservationist-3-beauties-bite-the-dust-episode-20-01_DlSsa7ti.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-cranky-preservationist-and-friends-in-save-700-normandie-avenue-koreatown-s-little-new-york-01.webp":"chunks/the-cranky-preservationist-and-friends-in-save-700-normandie-avenue-koreatown-s-little-new-york-01_Ct0Tqy80.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-cranky-preservationist-and-the-mystery-of-the-shrinking-hpoz-at-1330-w-pico-aka-the-albany-01.webp":"chunks/the-cranky-preservationist-and-the-mystery-of-the-shrinking-hpoz-at-1330-w-pico-aka-the-albany-01_BJW4yRjk.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-cranky-preservationist-in-don-t-f-with-my-bunker-hill-retaining-wall-episode-25-01.webp":"chunks/the-cranky-preservationist-in-don-t-f-with-my-bunker-hill-retaining-wall-episode-25-01_BN7HRf4t.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-cranky-preservationist-in-reports-of-the-death-of-the-white-log-coffee-shop-have-been-01.webp":"chunks/the-cranky-preservationist-in-reports-of-the-death-of-the-white-log-coffee-shop-have-been-01_C4l1r137.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-cranky-preservationist-in-what-the-hell-happened-to-the-pantages-neon-episode-22-01.webp":"chunks/the-cranky-preservationist-in-what-the-hell-happened-to-the-pantages-neon-episode-22-01_1dqhr_r7.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-cranky-preservationist-meets-the-l-a-preservation-imp-episode-21-01.webp":"chunks/the-cranky-preservationist-meets-the-l-a-preservation-imp-episode-21-01_BsT5Hjxg.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-face-of-the-ellis-act-01.webp":"chunks/the-face-of-the-ellis-act-01_BKIok7hP.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-face-of-the-ellis-act-02.webp":"chunks/the-face-of-the-ellis-act-02_DvFkxZXV.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-face-of-the-ellis-act-03.webp":"chunks/the-face-of-the-ellis-act-03_B5eOzr9j.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-face-of-the-ellis-act-04.webp":"chunks/the-face-of-the-ellis-act-04_B4X5B174.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-face-of-the-ellis-act-05.webp":"chunks/the-face-of-the-ellis-act-05_DgwVMXzT.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-face-of-the-ellis-act-06.webp":"chunks/the-face-of-the-ellis-act-06_aYoUJsXx.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-face-of-the-ellis-act-07.webp":"chunks/the-face-of-the-ellis-act-07_B_TFfWYH.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-face-of-the-ellis-act-08.webp":"chunks/the-face-of-the-ellis-act-08_BOdCEBPh.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-face-of-the-ellis-act-09.webp":"chunks/the-face-of-the-ellis-act-09_DiNgCACn.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-face-of-the-ellis-act-10.webp":"chunks/the-face-of-the-ellis-act-10_TGz6isZj.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-fairfax-has-fallen-01.webp":"chunks/the-fairfax-has-fallen-01_Bw7gSe19.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-fairfax-has-fallen-02.webp":"chunks/the-fairfax-has-fallen-02_Y107wspd.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-fairfax-has-fallen-03.webp":"chunks/the-fairfax-has-fallen-03_DuHPk2i_.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-fairfax-has-fallen-04.webp":"chunks/the-fairfax-has-fallen-04_FEVHUodd.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-fairfax-has-fallen-05.webp":"chunks/the-fairfax-has-fallen-05_Dre0HgRN.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-fairfax-has-fallen-06.webp":"chunks/the-fairfax-has-fallen-06_DyxuXJxw.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-fairfax-has-fallen-07.webp":"chunks/the-fairfax-has-fallen-07_CjAhC_94.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-fairfax-has-fallen-08.webp":"chunks/the-fairfax-has-fallen-08_B_nck5jp.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-fairfax-has-fallen-09.webp":"chunks/the-fairfax-has-fallen-09_BTaP87fs.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-fairfax-has-fallen-10.webp":"chunks/the-fairfax-has-fallen-10_BHcN6OXX.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-fairfax-has-fallen-11.webp":"chunks/the-fairfax-has-fallen-11_BPLF5I4U.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-fairfax-must-fall-01.webp":"chunks/the-fairfax-must-fall-01_BY2ceSLs.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-fairfax-must-fall-02.webp":"chunks/the-fairfax-must-fall-02_DQ10oqiL.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-fairfax-must-fall-03.webp":"chunks/the-fairfax-must-fall-03_BfZVauwP.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-fairfax-must-fall-04.webp":"chunks/the-fairfax-must-fall-04_B7jiil7J.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-fairfax-must-fall-05.webp":"chunks/the-fairfax-must-fall-05_DQKHjPOg.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-fairfax-must-fall-06.webp":"chunks/the-fairfax-must-fall-06_H62w7sJ-.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-fairfax-must-fall-07.webp":"chunks/the-fairfax-must-fall-07_DtKSAC2f.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-fairfax-must-fall-08.webp":"chunks/the-fairfax-must-fall-08_Mkh4HugJ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-first-new-post-in-a-very-long-time-01.webp":"chunks/the-first-new-post-in-a-very-long-time-01_B7Ns10KH.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-first-new-post-in-a-very-long-time-02.webp":"chunks/the-first-new-post-in-a-very-long-time-02_kFolmud6.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-house-at-1408-w-35th-st-and-then-some-01.webp":"chunks/the-house-at-1408-w-35th-st-and-then-some-01_DMHx8e1O.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-house-at-1408-w-35th-st-and-then-some-02.webp":"chunks/the-house-at-1408-w-35th-st-and-then-some-02_KRRjdBA3.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-house-at-1408-w-35th-st-and-then-some-03.webp":"chunks/the-house-at-1408-w-35th-st-and-then-some-03_CwsiVIQn.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-house-at-1408-w-35th-st-and-then-some-04.webp":"chunks/the-house-at-1408-w-35th-st-and-then-some-04_BEJmqGdT.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-house-at-1408-w-35th-st-and-then-some-05.webp":"chunks/the-house-at-1408-w-35th-st-and-then-some-05_4wZJ5SYn.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-house-at-1408-w-35th-st-and-then-some-06.webp":"chunks/the-house-at-1408-w-35th-st-and-then-some-06_CDZEdbcM.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-house-at-1408-w-35th-st-and-then-some-07.webp":"chunks/the-house-at-1408-w-35th-st-and-then-some-07_Dj05pBEJ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-house-at-1408-w-35th-st-and-then-some-08.webp":"chunks/the-house-at-1408-w-35th-st-and-then-some-08_DnkHmOVw.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-house-at-1408-w-35th-st-and-then-some-09.webp":"chunks/the-house-at-1408-w-35th-st-and-then-some-09_FeseXikF.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-house-at-1408-w-35th-st-and-then-some-10.webp":"chunks/the-house-at-1408-w-35th-st-and-then-some-10_CPIa80qe.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-house-at-1408-w-35th-st-and-then-some-11.webp":"chunks/the-house-at-1408-w-35th-st-and-then-some-11_Ku8Ipukh.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-house-at-1408-w-35th-st-and-then-some-12.webp":"chunks/the-house-at-1408-w-35th-st-and-then-some-12_BZZ327ol.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-house-at-1408-w-35th-st-and-then-some-13.webp":"chunks/the-house-at-1408-w-35th-st-and-then-some-13_DD5wZl27.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-house-at-1408-w-35th-st-and-then-some-14.webp":"chunks/the-house-at-1408-w-35th-st-and-then-some-14_DhBIbPFh.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-house-at-1408-w-35th-st-and-then-some-15.webp":"chunks/the-house-at-1408-w-35th-st-and-then-some-15_B3N6hRYR.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-house-at-1408-w-35th-st-and-then-some-16.webp":"chunks/the-house-at-1408-w-35th-st-and-then-some-16_Bw2DGk0S.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-house-at-1408-w-35th-st-and-then-some-17.webp":"chunks/the-house-at-1408-w-35th-st-and-then-some-17_DZ1bBH2n.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-house-at-1408-w-35th-st-and-then-some-18.webp":"chunks/the-house-at-1408-w-35th-st-and-then-some-18_Dt3C7KC0.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-house-at-1408-w-35th-st-and-then-some-19.webp":"chunks/the-house-at-1408-w-35th-st-and-then-some-19_CQSEkVmD.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-house-at-1408-w-35th-st-and-then-some-20.webp":"chunks/the-house-at-1408-w-35th-st-and-then-some-20_B8T_ZvjX.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-house-at-1408-w-35th-st-and-then-some-21.webp":"chunks/the-house-at-1408-w-35th-st-and-then-some-21_D10R61KF.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-house-at-1408-w-35th-st-and-then-some-22.webp":"chunks/the-house-at-1408-w-35th-st-and-then-some-22_Cw1zA6h1.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-house-of-spirits-01.webp":"chunks/the-house-of-spirits-01_B1fOqk-a.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-house-of-spirits-02.webp":"chunks/the-house-of-spirits-02_DRstQ70Z.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-house-of-spirits-03.webp":"chunks/the-house-of-spirits-03_C0EqYqld.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-house-of-spirits-04.webp":"chunks/the-house-of-spirits-04_DjlqGT9U.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-house-of-spirits-05.webp":"chunks/the-house-of-spirits-05_Cz352MD0.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-jardinette-apartments-will-they-return-from-the-dead-01.webp":"chunks/the-jardinette-apartments-will-they-return-from-the-dead-01_BSIpXpyE.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-jardinette-apartments-will-they-return-from-the-dead-02.webp":"chunks/the-jardinette-apartments-will-they-return-from-the-dead-02_Df5vc7D5.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-jardinette-apartments-will-they-return-from-the-dead-03.webp":"chunks/the-jardinette-apartments-will-they-return-from-the-dead-03_Cg_tHPIQ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-jardinette-apartments-will-they-return-from-the-dead-04.webp":"chunks/the-jardinette-apartments-will-they-return-from-the-dead-04_B3azq65a.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-jardinette-apartments-will-they-return-from-the-dead-05.webp":"chunks/the-jardinette-apartments-will-they-return-from-the-dead-05_D2Dm18M1.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-jardinette-apartments-will-they-return-from-the-dead-06.webp":"chunks/the-jardinette-apartments-will-they-return-from-the-dead-06_DmLMj8_T.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-jardinette-apartments-will-they-return-from-the-dead-07.webp":"chunks/the-jardinette-apartments-will-they-return-from-the-dead-07_CHneaLNG.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-jardinette-apartments-will-they-return-from-the-dead-08.webp":"chunks/the-jardinette-apartments-will-they-return-from-the-dead-08_rK7Eiy9H.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-jardinette-apartments-will-they-return-from-the-dead-09.webp":"chunks/the-jardinette-apartments-will-they-return-from-the-dead-09_fyoMPu_4.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-jardinette-apartments-will-they-return-from-the-dead-10.webp":"chunks/the-jardinette-apartments-will-they-return-from-the-dead-10_C15Pr5VU.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-jardinette-apartments-will-they-return-from-the-dead-11.webp":"chunks/the-jardinette-apartments-will-they-return-from-the-dead-11_DZyhVg1N.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-lost-art-deco-of-baldwin-hills-01.webp":"chunks/the-lost-art-deco-of-baldwin-hills-01_DHBDVshW.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-lost-art-deco-of-baldwin-hills-02.webp":"chunks/the-lost-art-deco-of-baldwin-hills-02_CnrbBFjU.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-lost-art-deco-of-baldwin-hills-03.webp":"chunks/the-lost-art-deco-of-baldwin-hills-03_BkKk3r5H.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-lost-art-deco-of-baldwin-hills-04.webp":"chunks/the-lost-art-deco-of-baldwin-hills-04_BSoUgYRY.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/the-lost-art-deco-of-baldwin-hills-05.webp":"chunks/the-lost-art-deco-of-baldwin-hills-05_Dv6Ug7rK.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/third-strike-wiseman-01.webp":"chunks/third-strike-wiseman-01_DRjD_HVA.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/third-strike-wiseman-02.webp":"chunks/third-strike-wiseman-02_B3COR15s.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/third-strike-wiseman-03.webp":"chunks/third-strike-wiseman-03_N-kOkJxH.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/third-strike-wiseman-04.webp":"chunks/third-strike-wiseman-04_B7j04ldG.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/third-strike-wiseman-05.webp":"chunks/third-strike-wiseman-05_CFFPZZe8.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/third-strike-wiseman-06.webp":"chunks/third-strike-wiseman-06_CCacXao-.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/third-strike-wiseman-07.webp":"chunks/third-strike-wiseman-07_BXHdL_Rp.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/third-strike-wiseman-08.webp":"chunks/third-strike-wiseman-08_DdIPbjYE.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/third-strike-wiseman-09.webp":"chunks/third-strike-wiseman-09_BVGTWyGN.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/third-strike-wiseman-10.webp":"chunks/third-strike-wiseman-10_ZikoTtGp.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/third-strike-wiseman-11.webp":"chunks/third-strike-wiseman-11_DdCnAGr3.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/third-strike-wiseman-12.webp":"chunks/third-strike-wiseman-12_DwD6JvP7.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/third-strike-wiseman-13.webp":"chunks/third-strike-wiseman-13_Zm0Sedq6.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/third-strike-wiseman-14.webp":"chunks/third-strike-wiseman-14_6CvDZtjG.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/third-strike-wiseman-15.webp":"chunks/third-strike-wiseman-15_D2GXjIcb.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/third-strike-wiseman-16.webp":"chunks/third-strike-wiseman-16_CgGkY-6N.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/thirty-posts-in-thirty-days-01.webp":"chunks/thirty-posts-in-thirty-days-01_e3J2cM5F.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/thirty-posts-in-thirty-days-02.webp":"chunks/thirty-posts-in-thirty-days-02_BWxrudar.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/thirty-posts-in-thirty-days-03.webp":"chunks/thirty-posts-in-thirty-days-03_DjWeUeSB.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/thirty-posts-in-thirty-days-04.webp":"chunks/thirty-posts-in-thirty-days-04_D6u_FUsq.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/thirty-posts-in-thirty-days-05.webp":"chunks/thirty-posts-in-thirty-days-05_Dl5IzZxu.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/thirty-posts-in-thirty-days-06.webp":"chunks/thirty-posts-in-thirty-days-06_D7f-dkdh.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/thirty-posts-in-thirty-days-07.webp":"chunks/thirty-posts-in-thirty-days-07_DoW1MVqP.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/thirty-posts-in-thirty-days-08.webp":"chunks/thirty-posts-in-thirty-days-08_D8OEgqcZ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/thirty-posts-in-thirty-days-09.webp":"chunks/thirty-posts-in-thirty-days-09_D0Mwdxrl.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/thirty-posts-in-thirty-days-10.webp":"chunks/thirty-posts-in-thirty-days-10_DvFYWPdJ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/thirty-posts-in-thirty-days-11.webp":"chunks/thirty-posts-in-thirty-days-11_B2c_Upnl.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/thirty-posts-now-what-01.webp":"chunks/thirty-posts-now-what-01_BvVlZ3-f.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/too-ugly-for-a-yimby-01.webp":"chunks/too-ugly-for-a-yimby-01_CBqt-ad4.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/too-ugly-for-a-yimby-02.webp":"chunks/too-ugly-for-a-yimby-02_C_agCY7p.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/too-ugly-for-a-yimby-03.webp":"chunks/too-ugly-for-a-yimby-03_D1YiV3CR.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/too-ugly-for-a-yimby-04.webp":"chunks/too-ugly-for-a-yimby-04_DtM6KVmz.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/too-ugly-for-a-yimby-05.webp":"chunks/too-ugly-for-a-yimby-05_DgVXEggZ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/too-ugly-for-a-yimby-06.webp":"chunks/too-ugly-for-a-yimby-06_C1G7CFvN.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/too-ugly-for-a-yimby-07.webp":"chunks/too-ugly-for-a-yimby-07_KwiQr4Hj.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/too-ugly-for-a-yimby-08.webp":"chunks/too-ugly-for-a-yimby-08_B9X4ASaW.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/too-ugly-for-a-yimby-09.webp":"chunks/too-ugly-for-a-yimby-09_CCC8Xahy.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/too-ugly-for-a-yimby-10.webp":"chunks/too-ugly-for-a-yimby-10_D9iirOhq.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/too-ugly-for-a-yimby-11.webp":"chunks/too-ugly-for-a-yimby-11_ia4LPzZc.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/too-ugly-for-a-yimby-12.webp":"chunks/too-ugly-for-a-yimby-12_BVM3Jacj.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/too-ugly-for-a-yimby-13.webp":"chunks/too-ugly-for-a-yimby-13_DQVH6aVG.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/too-ugly-for-a-yimby-14.webp":"chunks/too-ugly-for-a-yimby-14_C6_sPCYM.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/too-ugly-for-a-yimby-15.webp":"chunks/too-ugly-for-a-yimby-15_B_jsSEql.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/trebek-s-house-01.webp":"chunks/trebek-s-house-01_y_QvIy1Z.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/trebek-s-house-02.webp":"chunks/trebek-s-house-02_F2PMJMRb.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/trebek-s-house-03.webp":"chunks/trebek-s-house-03_CMsaYRq8.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/trebek-s-house-04.webp":"chunks/trebek-s-house-04_C9qlxKU9.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/trebek-s-house-05.webp":"chunks/trebek-s-house-05_B7Vkav9t.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/trebek-s-house-06.webp":"chunks/trebek-s-house-06_Bsdm6H2b.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/trebek-s-house-07.webp":"chunks/trebek-s-house-07_CXGBWxz6.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/trebek-s-house-08.webp":"chunks/trebek-s-house-08_8FaphaAF.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/trebek-s-house-09.webp":"chunks/trebek-s-house-09_C0Cfpe9E.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/trebek-s-house-10.webp":"chunks/trebek-s-house-10_ht0wJ1Z2.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/trebek-s-house-11.webp":"chunks/trebek-s-house-11_CgLUZ-8R.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/trebek-s-house-12.webp":"chunks/trebek-s-house-12_Go-QIfWh.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/trebek-s-house-13.webp":"chunks/trebek-s-house-13_DvYb-g7N.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/trebek-s-house-14.webp":"chunks/trebek-s-house-14_CVozENHs.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/trebek-s-house-15.webp":"chunks/trebek-s-house-15_Bsn9CR-K.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/trebek-s-house-16.webp":"chunks/trebek-s-house-16_Dy7bjgvn.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/trebek-s-house-17.webp":"chunks/trebek-s-house-17_DsQR_AVN.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/trebek-s-house-18.webp":"chunks/trebek-s-house-18_Ai3TVFE8.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/trebek-s-house-19.webp":"chunks/trebek-s-house-19_CZAeor9i.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/trebek-s-house-20.webp":"chunks/trebek-s-house-20_B78H4GUj.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/trebek-s-house-21.webp":"chunks/trebek-s-house-21_CZyuPk2W.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/trebek-s-house-22.webp":"chunks/trebek-s-house-22_C8ADDFYO.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/trebek-s-house-23.webp":"chunks/trebek-s-house-23_DvXcjg_r.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/trebek-s-house-24.webp":"chunks/trebek-s-house-24_-HGDw_ua.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/trebek-s-house-25.webp":"chunks/trebek-s-house-25_DJNDnQBS.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/trebek-s-house-26.webp":"chunks/trebek-s-house-26_BucNhVwl.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/trebek-s-house-27.webp":"chunks/trebek-s-house-27_d6XdR1Aa.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/trebek-s-house-28.webp":"chunks/trebek-s-house-28_BJnlYd7i.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/tripalink-worst-thing-ever-01.webp":"chunks/tripalink-worst-thing-ever-01_RQ7vXdZ2.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/tripalink-worst-thing-ever-02.webp":"chunks/tripalink-worst-thing-ever-02_C9RkRGc-.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/tripalink-worst-thing-ever-03.webp":"chunks/tripalink-worst-thing-ever-03_BGnTN9UI.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/tripalink-worst-thing-ever-04.webp":"chunks/tripalink-worst-thing-ever-04_BTiJvGiT.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/tripalink-worst-thing-ever-05.webp":"chunks/tripalink-worst-thing-ever-05_BAjmDCZA.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/tripalink-worst-thing-ever-06.webp":"chunks/tripalink-worst-thing-ever-06_CBAC4eVS.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/tripalink-worst-thing-ever-07.webp":"chunks/tripalink-worst-thing-ever-07_C89yLu9-.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/tripalink-worst-thing-ever-08.webp":"chunks/tripalink-worst-thing-ever-08_CTeeS8Ag.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/tripalink-worst-thing-ever-09.webp":"chunks/tripalink-worst-thing-ever-09_BGOqFIcd.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/tripalink-worst-thing-ever-10.webp":"chunks/tripalink-worst-thing-ever-10_D3iJTNIb.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/tripalink-worst-thing-ever-11.webp":"chunks/tripalink-worst-thing-ever-11_DPWwWKpz.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/tripalink-worst-thing-ever-12.webp":"chunks/tripalink-worst-thing-ever-12_CqWjRPEZ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/tripalink-worst-thing-ever-13.webp":"chunks/tripalink-worst-thing-ever-13_XzMd2aaW.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/tripalink-worst-thing-ever-14.webp":"chunks/tripalink-worst-thing-ever-14_DH9GZ6Fp.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/tripalink-worst-thing-ever-15.webp":"chunks/tripalink-worst-thing-ever-15_DEguG0RF.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/tripalink-worst-thing-ever-16.webp":"chunks/tripalink-worst-thing-ever-16_CUl-fxW_.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/tripalink-worst-thing-ever-17.webp":"chunks/tripalink-worst-thing-ever-17_CpLxf4d_.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/what-in-the-actual-hell-los-angeles-01.webp":"chunks/what-in-the-actual-hell-los-angeles-01_bt_mx7Jn.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/what-in-the-actual-hell-los-angeles-02.webp":"chunks/what-in-the-actual-hell-los-angeles-02_j4z9cQzW.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/what-in-the-actual-hell-los-angeles-03.webp":"chunks/what-in-the-actual-hell-los-angeles-03_Ck0-7s2m.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/what-in-the-actual-hell-los-angeles-04.webp":"chunks/what-in-the-actual-hell-los-angeles-04_ipaj1sIe.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/what-in-the-actual-hell-los-angeles-05.webp":"chunks/what-in-the-actual-hell-los-angeles-05_DzzNarlr.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/what-in-the-actual-hell-los-angeles-06.webp":"chunks/what-in-the-actual-hell-los-angeles-06_BRTyYOep.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/what-in-the-actual-hell-los-angeles-07.webp":"chunks/what-in-the-actual-hell-los-angeles-07_ZZpeIAqU.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/what-in-the-actual-hell-los-angeles-08.webp":"chunks/what-in-the-actual-hell-los-angeles-08_DgnfeJjz.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/what-in-the-actual-hell-los-angeles-09.webp":"chunks/what-in-the-actual-hell-los-angeles-09_sd2Q92Ag.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/what-in-the-actual-hell-los-angeles-10.webp":"chunks/what-in-the-actual-hell-los-angeles-10_BRToLxI6.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/what-in-the-actual-hell-los-angeles-11.webp":"chunks/what-in-the-actual-hell-los-angeles-11_CY_ei7XC.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/what-in-the-actual-hell-los-angeles-12.webp":"chunks/what-in-the-actual-hell-los-angeles-12_B20apq_1.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/what-in-the-actual-hell-los-angeles-13.webp":"chunks/what-in-the-actual-hell-los-angeles-13_Ccb-t-iI.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/what-in-the-actual-hell-los-angeles-14.webp":"chunks/what-in-the-actual-hell-los-angeles-14_Cd8S-5ti.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/what-in-the-actual-hell-los-angeles-15.webp":"chunks/what-in-the-actual-hell-los-angeles-15_7n5SKdns.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/what-in-the-actual-hell-los-angeles-16.webp":"chunks/what-in-the-actual-hell-los-angeles-16_BV6KRv0S.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/what-in-the-actual-hell-los-angeles-17.webp":"chunks/what-in-the-actual-hell-los-angeles-17_BrpfDduP.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/what-in-the-actual-hell-los-angeles-18.webp":"chunks/what-in-the-actual-hell-los-angeles-18_B_lXpE1_.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/what-in-the-actual-hell-los-angeles-19.webp":"chunks/what-in-the-actual-hell-los-angeles-19_Cd2yTgIt.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/what-in-the-actual-hell-los-angeles-20.webp":"chunks/what-in-the-actual-hell-los-angeles-20_BeQxqyBS.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/what-in-the-actual-hell-los-angeles-21.webp":"chunks/what-in-the-actual-hell-los-angeles-21_orj-vLVd.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/what-in-the-actual-hell-los-angeles-22.webp":"chunks/what-in-the-actual-hell-los-angeles-22_BO0PAeH2.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/what-in-the-actual-hell-los-angeles-23.webp":"chunks/what-in-the-actual-hell-los-angeles-23_CPIa0GVL.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/blog/what-in-the-actual-hell-los-angeles-24.webp":"chunks/what-in-the-actual-hell-los-angeles-24_B8yIqW9w.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/default.png":"chunks/default_QM87IPVZ.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/google-play.png":"chunks/google-play_CDg1QomI.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/hero-image.png":"chunks/hero-image_lJAIM6FU.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/nathan-marsak.jpg":"chunks/nathan-marsak_D1mye1J0.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/assets/images/nathan-marsak.webp":"chunks/nathan-marsak_DAyINTft.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/node_modules/astro/dist/assets/services/sharp.js":"chunks/sharp_CM8P8tiA.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/.astro/content-assets.mjs":"chunks/content-assets_RtexW5CW.mjs","\u0000virtual:astro:get-image":"chunks/_virtual_astro_get-image_Cij5k7Hu.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/.astro/content-modules.mjs":"chunks/content-modules_Dz-S_Wwv.mjs","\u0000astro:data-layer-content":"chunks/_astro_data-layer-content_CdD9ao6B.mjs","astro/entrypoints/prerender":"prerender-entry.Lvh4xJxe.mjs","@astrojs/vercel/entrypoint":"entry.mjs","\u0000virtual:astro:page:node_modules/@keystatic/astro/internal/keystatic-api@_@js":"chunks/keystatic-api_DIzftG75.mjs","\u0000virtual:astro:page:node_modules/@keystatic/astro/internal/keystatic-astro-page@_@astro":"chunks/keystatic-astro-page_DG8RHKzW.mjs","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/node_modules/@astro-community/astro-embed-vimeo/Vimeo.astro?astro&type=script&index=0&lang.ts":"_astro/Vimeo.astro_astro_type_script_index_0_lang.CgRsrQuG.js","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/node_modules/@astro-community/astro-embed-youtube/YouTube.astro?astro&type=script&index=0&lang.ts":"_astro/YouTube.astro_astro_type_script_index_0_lang.DRTAn-6M.js","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/node_modules/@keystatic/astro/internal/keystatic-page.js":"_astro/keystatic-page.B8KaJxZ0.js","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/node_modules/astro/components/ClientRouter.astro?astro&type=script&index=0&lang.ts":"_astro/ClientRouter.astro_astro_type_script_index_0_lang.CAqDO0tx.js","/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/pages/contact.astro?astro&type=script&index=0&lang.ts":"_astro/contact.astro_astro_type_script_index_0_lang.BhUMEVqP.js","astro:scripts/before-hydration.js":""},"inlinedScripts":[["/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/node_modules/@astro-community/astro-embed-vimeo/Vimeo.astro?astro&type=script&index=0&lang.ts","class t extends HTMLElement{constructor(){super(...arguments),this.videoId=encodeURIComponent(this.dataset.id)}static{this.preconnected=!1}connectedCallback(){this.addEventListener(\"pointerover\",t.warmConnections,{once:!0}),this.addEventListener(\"click\",e=>this.addIframe(e));const c=this.querySelector(\"a\");if(c){const e=document.createElement(\"button\");e.classList.add(...c.classList.values()),e.setAttribute(\"aria-label\",c.getAttribute(\"aria-label\")),c.replaceWith(e)}}static addPrefetch(c,e){const a=document.createElement(\"link\");a.rel=c,a.href=e,document.head.append(a)}static warmConnections(){t.preconnected||(t.addPrefetch(\"preconnect\",\"https://player.vimeo.com\"),t.addPrefetch(\"preconnect\",\"https://i.vimeocdn.com\"),t.addPrefetch(\"preconnect\",\"https://f.vimeocdn.com\"),t.addPrefetch(\"preconnect\",\"https://fresnel.vimeocdn.com\"),t.preconnected=!0)}addIframe(c){if(this.classList.contains(\"ltv-activated\"))return;c.preventDefault(),this.classList.add(\"ltv-activated\");const e=encodeURIComponent(this.dataset.t||\"0m\"),a=new URLSearchParams(this.dataset.params||[]),n=document.createElement(\"iframe\");n.width=\"640\",n.height=\"360\",n.allow=\"accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture\",n.allowFullscreen=!0,n.src=`https://player.vimeo.com/video/${this.videoId}?${a.toString()}#t=${e}`,this.append(n)}}customElements.get(\"lite-vimeo\")||customElements.define(\"lite-vimeo\",t);"],["/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/node_modules/@astro-community/astro-embed-youtube/YouTube.astro?astro&type=script&index=0&lang.ts","class i extends HTMLElement{connectedCallback(){this.videoId=this.getAttribute(\"videoid\");let e=this.querySelector(\".lyt-playbtn,.lty-playbtn\");if(this.playLabel=e&&e.textContent.trim()||this.getAttribute(\"playlabel\")||\"Play\",this.dataset.title=this.getAttribute(\"title\")||\"\",this.style.backgroundImage||(this.style.backgroundImage=`url(\"https://i.ytimg.com/vi/${this.videoId}/hqdefault.jpg\")`,this.upgradePosterImage()),e||(e=document.createElement(\"button\"),e.type=\"button\",e.classList.add(\"lyt-playbtn\",\"lty-playbtn\"),this.append(e)),!e.textContent){const t=document.createElement(\"span\");t.className=\"lyt-visually-hidden\",t.textContent=this.playLabel,e.append(t)}this.addNoscriptIframe(),e.nodeName===\"A\"&&(e.removeAttribute(\"href\"),e.setAttribute(\"tabindex\",\"0\"),e.setAttribute(\"role\",\"button\"),e.addEventListener(\"keydown\",t=>{(t.key===\"Enter\"||t.key===\" \")&&(t.preventDefault(),this.activate())})),this.addEventListener(\"pointerover\",i.warmConnections,{once:!0}),this.addEventListener(\"focusin\",i.warmConnections,{once:!0}),this.addEventListener(\"click\",this.activate),this.needsYTApi=this.hasAttribute(\"js-api\")||navigator.vendor.includes(\"Apple\")||navigator.userAgent.includes(\"Mobi\")}static addPrefetch(e,t,a){const r=document.createElement(\"link\");r.rel=e,r.href=t,a&&(r.as=a),document.head.append(r)}static warmConnections(){i.preconnected||(i.addPrefetch(\"preconnect\",\"https://www.youtube-nocookie.com\"),i.addPrefetch(\"preconnect\",\"https://www.google.com\"),i.addPrefetch(\"preconnect\",\"https://googleads.g.doubleclick.net\"),i.addPrefetch(\"preconnect\",\"https://static.doubleclick.net\"),i.preconnected=!0)}fetchYTPlayerApi(){window.YT||window.YT&&window.YT.Player||(this.ytApiPromise=new Promise((e,t)=>{var a=document.createElement(\"script\");a.src=\"https://www.youtube.com/iframe_api\",a.async=!0,a.onload=r=>{YT.ready(e)},a.onerror=t,this.append(a)}))}async getYTPlayer(){return this.playerPromise||await this.activate(),this.playerPromise}async addYTPlayerIframe(){this.fetchYTPlayerApi(),await this.ytApiPromise;const e=document.createElement(\"div\");this.append(e);const t=Object.fromEntries(this.getParams().entries());this.playerPromise=new Promise(a=>{let r=new YT.Player(e,{width:\"100%\",videoId:this.videoId,playerVars:t,events:{onReady:n=>{n.target.playVideo(),a(r)}}})})}addNoscriptIframe(){const e=this.createBasicIframe(),t=document.createElement(\"noscript\");t.innerHTML=e.outerHTML,this.append(t)}getParams(){const e=new URLSearchParams(this.getAttribute(\"params\")||[]);return e.append(\"autoplay\",\"1\"),e.append(\"playsinline\",\"1\"),e}async activate(){if(this.classList.contains(\"lyt-activated\"))return;if(this.classList.add(\"lyt-activated\"),this.needsYTApi)return this.addYTPlayerIframe(this.getParams());const e=this.createBasicIframe();this.append(e),e.focus()}createBasicIframe(){const e=document.createElement(\"iframe\");return e.width=560,e.height=315,e.title=this.playLabel,e.allow=\"accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture\",e.allowFullscreen=!0,e.referrerPolicy=\"strict-origin-when-cross-origin\",e.src=`https://www.youtube-nocookie.com/embed/${encodeURIComponent(this.videoId)}?${this.getParams().toString()}`,e}upgradePosterImage(){setTimeout(()=>{const e=`https://i.ytimg.com/vi_webp/${this.videoId}/sddefault.webp`,t=new Image;t.fetchPriority=\"low\",t.referrerpolicy=\"origin\",t.src=e,t.onload=a=>{a.target.naturalHeight==90&&a.target.naturalWidth==120||(this.style.backgroundImage=`url(\"${e}\")`)}},100)}}customElements.define(\"lite-youtube\",i);"],["/Users/spinoza/Desktop/ASTRO/CLAUDE/RIP-Claude-ASTRO/src/pages/contact.astro?astro&type=script&index=0&lang.ts","const t=document.getElementById(\"contact-form\"),e=document.getElementById(\"submit-btn\"),s=document.getElementById(\"success-msg\"),n=document.getElementById(\"error-msg\");t.addEventListener(\"submit\",async i=>{i.preventDefault(),e.disabled=!0,e.textContent=\"Sending…\",s.classList.add(\"hidden\"),n.classList.add(\"hidden\");const a=Object.fromEntries(new FormData(t));try{const o=await fetch(\"https://api.web3forms.com/submit\",{method:\"POST\",headers:{\"Content-Type\":\"application/json\",Accept:\"application/json\"},body:JSON.stringify(a)}),c=await o.json();if(o.ok&&c.success)t.reset(),s.classList.remove(\"hidden\"),s.scrollIntoView({behavior:\"smooth\",block:\"center\"});else throw new Error(c.message||\"Submission failed\")}catch{n.classList.remove(\"hidden\"),n.scrollIntoView({behavior:\"smooth\",block:\"center\"})}finally{e.disabled=!1,e.textContent=\"Send Message\"}});"]],"assets":["/_headers","/robots.txt","/_astro/ClientRouter.astro_astro_type_script_index_0_lang.CAqDO0tx.js","/_astro/keystatic-page.B8KaJxZ0.js","/decapcms/config.yml","/decapcms/index.html","/_astro/app-store.t3tG4Jz3.png","/_astro/008a40d14430a2258a70700cc20fbb57f2173dc6.RHi1D2gD.jpg","/_astro/00f90a3a86c8b0746e5ca3cb1be7dec434bd1618.DrO7VcVY.jpg","/_astro/00c36666587607758dad110905629fc782ad74f4.DK5Sg7Cq.jpg","/_astro/01515814add7deb331bd90ad7fb5b899267a0842.BY7cbAZa.jpg","/_astro/01531b6a53899c0762cca3b5fa743cb70216a98a.Clg7lmIO.jpg","/_astro/010d745cc3633c7e65c4f725fee5ba9d68d4ef79.Dp5r5Uzx.jpg","/_astro/0162d7149ab70947623d9b7ccdafa93d559ba4c2.DsxhsXf8.jpg","/_astro/0179073f81f3e8295967bb959bfbf09d53ba4c24.13A4uNSe.jpg","/_astro/023c02aeb28baeea21ebc19c9d197d79839df088.B2SYQ18V.jpg","/_astro/023e6fdd1356781c476ec09bf1a663895bda7868.DCdf68bu.jpg","/_astro/02430d203a310bd865817aa352bd0b969f89e2ae.Bs5iVrzT.jpg","/_astro/028990fcb181487b0315fd9a763d4bfefdfab21b.1rLUz9s9.jpg","/_astro/033f54e9ec1dff5cba56d609558e0bd70a4aeb97.C_Upyk4M.jpg","/_astro/02f8c34ee1b0d42f849ae5c7b5f75adcb5b830f4.DeXzUKiv.jpg","/_astro/03613248b3bc02a7a24793424ad6184613f97449.3q4hAuAg.jpg","/_astro/03c6a714a26da8a461e1d89fafee588d9e54a57a.Bvemwd-E.jpg","/_astro/0403780ccb6eac246ec9a3e8e1ae0fc916706585.CKFRiESe.jpg","/_astro/044b4f5c3aaa88a7f0a2222cdac10df39aab3d23.BRiaSHpm.jpg","/_astro/043b8508277c267d1fc1325b48dda3f33bf9051f.DLcaUR_Z.jpg","/_astro/044c6d3cdb855799657f911c68fb2a062ab41152.BQtg6u_2.jpg","/_astro/04547f33b935e22df92fa23f0c207f3a5d2f5f42.DIDT6BAs.jpg","/_astro/045ac1840dca1d71a7543f7912cfd72a94a1194e.DTLektuo.jpg","/_astro/048c36bd1706ffb8f5e1ab4a4a96e27a725ba0b9.CquN5Pge.jpg","/_astro/04c2d35d2e2563ce581bdd9bd5c4f607bdb40050.M5Mxszpd.jpg","/_astro/06788b010048ebc5b5b379dc46e733f6fab2022f.Da1HqzRm.jpg","/_astro/06afeab0bbeadf09a0863a996db708e272e28c37.uSv8mJkB.jpg","/_astro/070eef856fa8402a5fef4fd1b0046167d11fb52c.C9gKcp9K.jpg","/_astro/074a05fda51cf31c1df0621817cdbae2933b1fb7.C0E2Yqag.jpg","/_astro/07975fa2ea05c23e1ef95d5beda108c3f8d5fdde.DtxhT9I8.jpg","/_astro/0807320923aa04e416febc9aafa3ee95947862c4.BWM4cQRX.jpg","/_astro/086d8125ca64106ba79d4d0aa0ba8a04d678ae42.X0EExdYq.jpg","/_astro/08c9a8982ca48848e26724d8bed4bd65ca1c8088.-NGVObNE.jpg","/_astro/08ead11a10749522192edfda529798a21964e4b6.hG59RxR3.jpg","/_astro/090157ba608a1af0cbf3e15fcf5a3564782ae289.BwIZ3DQg.jpg","/_astro/0979a7f5d0b107412e7dd263f3542437e9c0440b.B4FrEa3b.jpg","/_astro/09721916acef024c52b6712fd305ba289b0e56d6.EXtT7rzj.jpg","/_astro/099e29fdafb774e5a065f1d7c111b9c89102dac2.Br8C5zvR.jpg","/_astro/0a688a5641e458e43ae7e9241efacb2f0a569762.DzhFq9Yg.jpg","/_astro/09cd945c039328e2529568084c2dc1f469fff274.D7QCuYLl.jpg","/_astro/0b039a712f7b80bf0d6836090b1cd09baa929088.DF1NJaSa.jpg","/_astro/0b748f9285c6f3ecf7425f030057ee7a97802b79.DVUUY9AB.jpg","/_astro/0bffc5378d05c9607cb0e323dfc65fb7072a5f1a.yhSYUwe2.jpg","/_astro/0b4695a9c75e7215591f80c115616f140378fc6e.6flvSJQV.jpg","/_astro/0bc6417a6d469187ea7c910677e8ba7fc66afa25.BQA7L-fc.jpg","/_astro/0c6706f52f301eaaa027aac3dbb8bda512c72cff.7vA4I0hQ.jpg","/_astro/0c87fdb76e7f540a257e2fa6ac575acba2110ae7.DxXZ3E48.jpg","/_astro/0c231d05946936f1bcd3246749c0276d9105210c.D9pwbknt.jpg","/_astro/0d8377529dbf649c427417f5fa24e14c59fd4c84.kTsouUwD.jpg","/_astro/0dd3be1d8bc6923f73d20e5c58a1330f0a46b525.CAYweWfZ.jpg","/_astro/0eb280cd6912bd22f1edd15e03bd47441a462051.Cf3XHT0x.jpg","/_astro/0e84659ad092a865fd341ed4447335af5ff98a62.Bslpj1Dz.jpg","/_astro/0e8d92c0391e32232f09549c73f362737eacf30e.CVmIzyzj.jpg","/_astro/0f2c990bbd527be8f06fe8f2e8c8e71ca3db545f.ChUUKgE0.jpg","/_astro/0faba65ebe33d47f4705a320acc2df4fc088e1e7.Dk2tZJpl.jpg","/_astro/0f72d073457bade096cea7f713e958fd068e5387.CshZIA1r.jpg","/_astro/1002b3e369003f820e697e80e9df824372e954dc.Bt1MFclO.jpg","/_astro/0fd9e17cdf6562440d6b200ef9efb5b2ac6dfb2f.Ct54BVXf.jpg","/_astro/104b8bc35444bf07c4ed287eb51722dae8e65e09.5uOL-6xT.jpg","/_astro/10555-bloomfield-street-toluca-lake-03.DIduqZPB.webp","/_astro/10555-bloomfield-street-toluca-lake-01.Cblp43RA.webp","/_astro/10555-bloomfield-street-toluca-lake-07.Dfi62fTn.webp","/_astro/10555-bloomfield-street-toluca-lake-02.BvxecM4N.webp","/_astro/10555-bloomfield-street-toluca-lake-08.DUew3Yu5.webp","/_astro/10555-bloomfield-street-toluca-lake-05.CjqiQdWS.webp","/_astro/10555-bloomfield-street-toluca-lake-06.Dw1n7LfO.webp","/_astro/10912-west-blix-st-no-hollywood-01.DuW8N8re.webp","/_astro/10555-bloomfield-street-toluca-lake-09.COwsoP3J.webp","/_astro/10912-west-blix-st-no-hollywood-02.BegNXX4A.webp","/_astro/10912-west-blix-st-no-hollywood-03.DTe95q88.webp","/_astro/10912-west-blix-st-no-hollywood-04.CzeA4jRf.webp","/_astro/10912-west-blix-st-no-hollywood-06.Cxo1QWYY.webp","/_astro/10912-west-blix-st-no-hollywood-05.BUovQ1HM.webp","/_astro/10c4bd06e792366699666aba2c3fb04bae124b3e.BsWEcJn-.jpg","/_astro/1118d95f1957385e3810a1eaba4bb5bf29baa1e3.H_Tx1HaL.jpg","/_astro/10d0da3fd596c7fe73f65924d0c6e5ae323eb992.B0JB2NwT.jpg","/_astro/1138-wilshire-blvd-01.HYcbC2f6.webp","/_astro/1131d9757cd39aace83c4414c5dc0831c15b5eb8.Bf-qOZpa.jpg","/_astro/1138-wilshire-blvd-03.CQXh0UZ1.webp","/_astro/1138-wilshire-blvd-02.CyLE0dnD.webp","/_astro/1138-wilshire-blvd-07.cLiYFpgo.webp","/_astro/1138-wilshire-blvd-04.C2yVW4au.webp","/_astro/1138-wilshire-blvd-05.Ba2BwMym.webp","/_astro/1138-wilshire-blvd-06.C_jl-jx2.webp","/_astro/11be312dc569a0e4aa37b96dc43ddefb7160ee5e.YuWoVS7J.jpg","/_astro/1138-wilshire-blvd-08.jKklydjt.webp","/_astro/10555-bloomfield-street-toluca-lake-04.DUsB_OVj.webp","/_astro/12054dd4e67ac826560f922a82419dc54aec50f7.B4fQeluf.jpg","/_astro/11ccee4003455bf4fb521480a267a2931a68773d.C7o4deme.jpg","/_astro/12c396e1d3798a55964060c363405d9dbb3b49f6.HevJ61ua.jpg","/_astro/1321-bates-ave-01.UAOufbSO.webp","/_astro/1321-bates-ave-02.B5qeokrZ.webp","/_astro/1321-bates-ave-03.CJ6EZrey.webp","/_astro/1321-bates-ave-04.Bn_Q3_YY.webp","/_astro/1321-bates-ave-07.ChUO-TBg.webp","/_astro/1321-bates-ave-06.C0WJTQ9h.webp","/_astro/1321-bates-ave-05.OvaKy3C2.webp","/_astro/1321-bates-ave-09.CtDM_J41.webp","/_astro/1321-bates-ave-10.1i2gUYPm.webp","/_astro/1321-bates-ave-11.Z9yqCHiZ.webp","/_astro/1321-bates-ave-08.1eJ0pmSy.webp","/_astro/1346-and-1332-north-fairfax-01.C4ID2HvV.webp","/_astro/1346-and-1332-north-fairfax-02.DwLVL_ED.webp","/_astro/1346-and-1332-north-fairfax-03.BhNPyQC-.webp","/_astro/1346-and-1332-north-fairfax-05.Dvng9sjm.webp","/_astro/1346-and-1332-north-fairfax-04.DuFqr9_X.webp","/_astro/1346-and-1332-north-fairfax-06.6hSsY-Ph.webp","/_astro/1346-and-1332-north-fairfax-07.CAlBqWDa.webp","/_astro/1346-and-1332-north-fairfax-10.CeEhUzk6.webp","/_astro/1346-and-1332-north-fairfax-09.DSgc7DXe.webp","/_astro/1346-and-1332-north-fairfax-08.DdM0ejvj.webp","/_astro/1346-and-1332-north-fairfax-11.B9IRy4XG.webp","/_astro/1346-and-1332-north-fairfax-12.DeCiMURd.webp","/_astro/1346-and-1332-north-fairfax-13.DBT9BqEJ.webp","/_astro/1346-and-1332-north-fairfax-14.CUhVxR2T.webp","/_astro/1346-and-1332-north-fairfax-15.DIX7L2HH.webp","/_astro/13921-vanowen-st-van-nuys-01.C62Rzvif.webp","/_astro/1346-and-1332-north-fairfax-16.TAimWS7x.webp","/_astro/13921-vanowen-st-van-nuys-02.D4iJa-Es.webp","/_astro/13921-vanowen-st-van-nuys-04.DOYedBZL.webp","/_astro/13921-vanowen-st-van-nuys-03.BbVLVu4b.webp","/_astro/13921-vanowen-st-van-nuys-05.BpRFJqW2.webp","/_astro/1412-n-mariposa-01.DmT8mRBN.webp","/_astro/1412-n-mariposa-02.K82fKNW6.webp","/_astro/1412-n-mariposa-03.sg_O9zLJ.webp","/_astro/1412-n-mariposa-05.Byaqf6Mv.webp","/_astro/1412-n-mariposa-06.gL3KqqQB.webp","/_astro/1412-n-mariposa-04.DlnwglnF.webp","/_astro/1412-n-mariposa-07.BRqDBR1_.webp","/_astro/1412-n-mariposa-08.DoEoQvRr.webp","/_astro/1412-n-mariposa-09.FZVxqlAG.webp","/_astro/14386b51021c7b08aba7c354f83e715d5a2ce038.FQ5tIZG_.jpg","/_astro/1449-51-echo-park-ave-01.Cf1LU8UG.webp","/_astro/1449-51-echo-park-ave-02.DuOKc7aQ.webp","/_astro/1449-51-echo-park-ave-03.B7sq1Qig.webp","/_astro/1449-51-echo-park-ave-04.DOIH-1zn.webp","/_astro/1449-51-echo-park-ave-05.puG_Yh75.webp","/_astro/1449-51-echo-park-ave-06.MUelZOZj.webp","/_astro/1449-51-echo-park-ave-07.i_QcogOf.webp","/_astro/1449-51-echo-park-ave-08.BjhxYU2K.webp","/_astro/149d763bb20a0305c49bc64586ad0cf27192c2a8.U0aywboW.jpg","/_astro/1517-23-w-8th-st-01.CQjxIZap.webp","/_astro/1517-23-w-8th-st-02.PGpKMvHS.webp","/_astro/1517-23-w-8th-st-03.wxGhPRKm.webp","/_astro/1517-23-w-8th-st-04.shJV3WmA.webp","/_astro/1517-23-w-8th-st-05._87axMrI.webp","/_astro/1529-n-winona-blvd-01.dWJEv_3v.webp","/_astro/1529-n-winona-blvd-02.CMvPEOvS.webp","/_astro/1529-n-winona-blvd-03.Cvs8294k.webp","/_astro/1529-n-winona-blvd-05.CjEjX0eV.webp","/_astro/1529-n-winona-blvd-04.BZ9B8ekh.webp","/_astro/1529-n-winona-blvd-06.CjyFNjzw.webp","/_astro/1529-n-winona-blvd-07.CR6cn1K9.webp","/_astro/1529-n-winona-blvd-08.8xHkOz2V.webp","/_astro/1529-n-winona-blvd-09.D2lWXWoq.webp","/_astro/1531-south-sawtelle-bundy-lock-and-key-01.D5XbUFGU.webp","/_astro/1529-n-winona-blvd-10.CFUuBmyB.webp","/_astro/1531-south-sawtelle-bundy-lock-and-key-03.EkkCJo1E.webp","/_astro/1531-south-sawtelle-bundy-lock-and-key-02.BkFRdNC9.webp","/_astro/1529-n-winona-blvd-11.BXdj5Qvd.webp","/_astro/1531-south-sawtelle-bundy-lock-and-key-04.CA3cVXi3.webp","/_astro/1531-south-sawtelle-bundy-lock-and-key-05.ZdMVP_x6.webp","/_astro/1648be395384dd989323204e1fd86db332d6184d.CpSrqD2s.png","/_astro/1556d379e59848990696df5e9b48e8f0cd33aeb0.DyTp2KNY.jpg","/_astro/153d65314ecfea0c4f39b8a7d499131839f2796b.D17qNvoT.jpg","/_astro/1723-n-wilcox-ave-01.BV4mZF2o.webp","/_astro/1723-n-wilcox-ave-02.Cph7cMgs.webp","/_astro/1723-n-wilcox-ave-03.Bu837cbh.webp","/_astro/1723-n-wilcox-ave-04.DniiTIwG.webp","/_astro/1723-n-wilcox-ave-05.1ib7Daev.webp","/_astro/1723-n-wilcox-ave-06.C0DVc4NG.webp","/_astro/1723-n-wilcox-ave-07.Z8OW2Rq5.webp","/_astro/1723-n-wilcox-ave-08.BkEjNcX-.webp","/_astro/172e5199bfd13e19215d5cc081765fedc7bbd67f.CGBBI3Cf.jpg","/_astro/1773bb8cae20b3684c41aca5dc16280d87c39637.DPqHP5HG.jpg","/_astro/1809-n-van-ness-01.sMFwiHZN.webp","/_astro/17096e76fb5e8323de5fe1a346ec2316f9703afa.sV5c5VGg.jpg","/_astro/1809-n-van-ness-03.gGHPXYN8.webp","/_astro/1809-n-van-ness-05.Cu131zaO.webp","/_astro/1809-n-van-ness-02.DUBViF5u.webp","/_astro/1809-n-van-ness-04.DBF5OSnX.webp","/_astro/1809-n-van-ness-06.CDXRQQWO.webp","/_astro/1820-north-berendo-must-die-01.JYiUbsJh.webp","/_astro/1820-north-berendo-must-die-03.CVqefyCi.webp","/_astro/1820-north-berendo-must-die-02.CvDmtnNF.webp","/_astro/1820-north-berendo-must-die-04.BTVns8zg.webp","/_astro/1820-north-berendo-must-die-07.BAWpHUYY.webp","/_astro/1820-north-berendo-must-die-06.CqNqt-FA.webp","/_astro/1820-north-berendo-must-die-05.CHB1rgeh.webp","/_astro/183b091d4c2cca34581587130161eb417e0198f8.CnsGo-tY.jpg","/_astro/1844-n-alexandria-ave-01.5wvyJGV2.webp","/_astro/1844-n-alexandria-ave-03.DgEHAE62.webp","/_astro/1844-n-alexandria-ave-02.Ax6zcLm7.webp","/_astro/1844-n-alexandria-ave-05.DTxleYGx.webp","/_astro/1844-n-alexandria-ave-06.sdM-EWvT.webp","/_astro/1844-n-alexandria-ave-04.Rc6j53uY.webp","/_astro/1844-n-alexandria-ave-07.Ze9fFcG7.webp","/_astro/18966dd72ae1a1960922b953ce306a3d85025728.DF_K9UHk.jpg","/_astro/18afe9cb18aafc17a48f447984d503deb970c6c4.i0-2cmmP.jpg","/_astro/1a00c1eec9a5addfe6e507625e1bbd80e76a5bf0.BsGQhEvP.jpg","/_astro/18b01e55205c82819988a145ecfdb682c386df7c.CQAO-R4O.jpg","/_astro/1b07164a9360a002a4c6c0cb9d0286b749f33064.BCA_k0Oz.jpg","/_astro/1ab5c2ad766357870721c812adeb8325ea94a7ea.DkL1IkhC.png","/_astro/1acffdb878e599009c48a2a4a0375a05f11963c0.ne9EB3J8.jpg","/_astro/1b255da3dc33dfb75baf0491e7b3883670277326.B5mhTyFs.jpg","/_astro/1ce14080dc00dbf1be380ea6afc08ec1ea9b836a.COnki6u_.jpg","/_astro/1d4d79f6cb9610436e64c8079afa8c4ceadd7865.CkoMa9ob.jpg","/_astro/1c5c812662f4f9543093d4d84e63abd415bc0265.2QkZM96M.jpg","/_astro/1d8db4e53cc3de48ac32bd0715f90b7678a31f7a.BGJGb93x.jpg","/_astro/1deeaaf61779c63f46c7e1d9423b8e7a3b69ed53.CoNrdBSb.jpg","/_astro/1d81c2737ec6ccdd43c5ae43961b3b9cbde545ed.BwGSTfQA.jpg","/_astro/1e2ba3a77191407acf6ecccc068a506673ab60d8.CRUt3ob4.png","/_astro/1f83c567c1844ed7d2ae0c16978d91d838fbf0d8.9_cHMYtZ.jpg","/_astro/1f975817b3aab6d31f82b16348d9f7144f57a552.DPT2zZo2.jpg","/_astro/1f85e290407f03a015f6edad1b8ac3999f8985d4.BVJaqJu-.jpg","/_astro/2046f26ebea871b4a99892b7d9343294bb2ca236.B0G-MzZq.jpg","/_astro/208-n-crescent-dr-beverly-hills-01.QRYtfJEo.webp","/_astro/20650df94e068d32c8806feabf91c7c078e9711c.DF8cCkuK.jpg","/_astro/208-n-crescent-dr-beverly-hills-04.BdViNHoB.webp","/_astro/208-n-crescent-dr-beverly-hills-02.DQdrg4a8.webp","/_astro/208-n-crescent-dr-beverly-hills-03.BQRjH7RR.webp","/_astro/208-n-crescent-dr-beverly-hills-05.B22S_9ah.webp","/_astro/208-n-crescent-dr-beverly-hills-06.DUTeFob2.webp","/_astro/213401a617b0197fd6f3ec394961e4a389a79bc1.CRTgodCv.jpg","/_astro/20e8a77d595533ae7ecebadbdfffcd3148a8b272.B-ySmyvX.jpg","/_astro/2160c6d9659193e8924026f9f0e6cd6650a575fd.TuQF0mEF.jpg","/_astro/21bc20817846af625647a30521a2caef90667b69.AC-ZuhZH.jpg","/_astro/226-n-berendo-st-01.CklsgUNE.webp","/_astro/20ee7ad5aa85cf2c3f08ef47fb42a90ddde846ec.BgZUO3L-.jpg","/_astro/226-n-berendo-st-05.E0TkeiZp.webp","/_astro/226-n-berendo-st-03.Bub0sbGG.webp","/_astro/226-n-berendo-st-04.cR4ZC3YA.webp","/_astro/226-n-berendo-st-07.BWFvZMDA.webp","/_astro/226-n-berendo-st-06.DFRSi17t.webp","/_astro/226-n-berendo-st-08.DP4DIonW.webp","/_astro/226-n-berendo-st-11.BhPFcKVm.webp","/_astro/226-n-berendo-st-10.DiCqGFey.webp","/_astro/226-n-berendo-st-09.y_Hrogr9.webp","/_astro/226-n-berendo-st-14.Cv26y3pG.webp","/_astro/226-n-berendo-st-12.CweBUJVf.webp","/_astro/22ca3dd15a6511b25a6a19e5859261fa08a0913c.BLeou1-G.jpg","/_astro/230531246340eb995be56c69455c7afd2976d637.ByvzfXHO.jpg","/_astro/226-n-berendo-st-13.Bo6OYWVa.webp","/_astro/240e6949a489d70481cbcf97ed41a25a5ae38caf.DizQ6tma.jpg","/_astro/23a1f4b1c0fbca1e77e3c0c615294c85ae318110.Dp22DMxC.jpg","/_astro/23c3396cdcd028fee9d2d993d731ac5ccb0de95c.Gy_ylZ-d.jpg","/_astro/2445e133273cb7280c33043b18867bb13a2bdd9c.GLcXs2HM.jpg","/_astro/24132b6359174d45395645ff934af993972f2ae4.RQXjlB-8.jpg","/_astro/2502eb0d9fe1e6cf6e5e9f23479d5c11bfa30193.BsLHeW_c.jpg","/_astro/25a60fe490c824937bf6d80bd5a6457d4bac8d5f.JDHrvJ2K.jpg","/_astro/247bdbb6e1e2a7ed82d9be2628114d4f4249295f.BcFgLOwg.jpg","/_astro/25b2132a6573e4dcaa0260ecacd128d0e167ad49.CEsmr5GW.jpg","/_astro/25e03f72cc3adca025eafbd3df58b0195b3bb55e.Bvevv8YJ.png","/_astro/26058c89ada5881a3ce47ef2718e6ff9e299f768.CMF6qooi.jpg","/_astro/2656-s-magnolia-01.Bri7rFUz.webp","/_astro/2656-s-magnolia-02.CR4YIE0a.webp","/_astro/226-n-berendo-st-15.DHteuwFg.webp","/_astro/2656-s-magnolia-05.LOG_hgrm.webp","/_astro/2656-s-magnolia-04.EWErh7VL.webp","/_astro/2656-s-magnolia-03.DiGC25r-.webp","/_astro/2656-s-magnolia-07.BlNJsE3m.webp","/_astro/2656-s-magnolia-06.n6SIe2-f.webp","/_astro/2656-s-magnolia-09.n6ArP_Uz.webp","/_astro/2656-s-magnolia-08.Uechqzic.webp","/_astro/26cbc386def087f312ea756e9b2f7651c35cbcf9.laZtrIBp.jpg","/_astro/2785947ddf22e75568d12b88ce2c225549c412eb.CwpM98Wm.jpg","/_astro/2801713c988fd528334e7a0f406578a3869fc40b.D4ZrYtnQ.jpg","/_astro/28cd02d8e08063c7b2af1b424310e9d05d617013.BU88Fhty.jpg","/_astro/27ca527a496b8614985a750b3abdb46007cba17e.4otGsO2M.jpg","/_astro/286e2c0622f663444cdcde1d267b01f522b5f7f5.CTUxilNR.jpg","/_astro/2747fc6dbfa4a00968f6fbce6a3a333905f58be4.BACvgHMr.jpg","/_astro/29e066a5ea0a88dc83ad23eaed1f17991714ff4d.BnDudFsF.jpg","/_astro/2a171e6d0352e552a06043d35565429d7192c847.T7nZeYY3.jpg","/_astro/2a35c26181ee2d029fad6db707de7e1b752f4111.CEvF5Imu.jpg","/_astro/2a9e1a28addbed5dac8ac0c420f3b44eeb144edd.DrOdyVLy.jpg","/_astro/2ada392d2f0a320aac41f641eb4b987e39962041.DFCwOQVz.jpg","/_astro/2b8cedd31f4f6dff158f3ac49e8a0da28e93abd8.Dd4ZFRi5.jpg","/_astro/2c291e0aef0940e2cd8c411eb761f22a9cc04e1e.Dge0ulEK.jpg","/_astro/2c2d5c41ac355b4ed5d54f3b518de742a96ecb12.Dd4LqU9v.jpg","/_astro/2dcef3574d6d66d6c9f4cb94d7c984cc065a1cb1.Bza-F5mL.jpg","/_astro/2decd1409e025ea9df1a6a8041593a299660dd4e.C5aSteQy.jpg","/_astro/2fce61d7ee199636bb1056807e9bba2cc3117556.vwT4xlFX.jpg","/_astro/2e4c9b72940b681805c267d93cb82c4b1ad2fce6.Cb53iclu.png","/_astro/2f9a6e7f47c8eab10351aa70090fad16e4af7fdf.C8LQcPBi.jpg","/_astro/301d5949af0637273640efffbe5a8a17b2415662.DEduG6t5.jpg","/_astro/3146c6cc1eeb234de6114ca7580bdb5c2be30e28.DL7-VTk-.jpg","/_astro/310a90e422acf62723856f410ee92b7e3325c77c.C59lV6pM.jpg","/_astro/306862b90ae58398af71836ff67c5f8e95ae787c.9oYpE8c5.jpg","/_astro/31e94959c6ebc3da2abbb3b2f498a7a34e034c6d.DmNI5dS4.jpg","/_astro/3206bce10f1ee9dc42c43b7b880fed14e287b2f7.Bnloz-Dk.jpg","/_astro/31f321e52d4a85b0afdaa88041224ccdf4f37d65.DSMRm0JK.jpg","/_astro/308538130926ef8b8c5a5cbd5a28d3631b077aeb.VXR76rta.jpg","/_astro/326b27099e6a3e2a9dde48308a70fc2dd6192b3a.Do7-F6MD.jpg","/_astro/3421296dd6111bd99b1376e416a5667cc3dacac9.CRk_7pBX.jpg","/_astro/333ce80121aef514e5a9c92c636404a912ee4f40.D9jeatxA.jpg","/_astro/3525-south-bronson-ave-01.Cohbzfnd.webp","/_astro/3525-south-bronson-ave-02.DOuBKgcc.webp","/_astro/348ce9ef3ce8d9b2c36db2d57b80aa74bc58968a.CO5sFrj3.jpg","/_astro/3525-south-bronson-ave-05.YV4qswtr.webp","/_astro/3525-south-bronson-ave-04.BWyPVHqo.webp","/_astro/3525-south-bronson-ave-07.BD5JUTI5.webp","/_astro/3525-south-bronson-ave-06.CEwNcDn0.webp","/_astro/354-north-avenue-53-01.vlfhTirZ.webp","/_astro/3525-south-bronson-ave-03.Y1vJ6Ghs.webp","/_astro/354-north-avenue-53-02.DKKad7cl.webp","/_astro/354-north-avenue-53-04.BqlNnISd.webp","/_astro/354-north-avenue-53-03.Cbs2EyxT.webp","/_astro/354-north-avenue-53-06.8PtW-lpO.webp","/_astro/354-north-avenue-53-09.C8W4P4xp.webp","/_astro/354-north-avenue-53-05.DR-xnz7j.webp","/_astro/354-north-avenue-53-07.mo1pRAez.webp","/_astro/354-north-avenue-53-08.DC690VPW.webp","/_astro/354-north-avenue-53-12.FBbafF4N.webp","/_astro/354-north-avenue-53-10.DSqARkXA.webp","/_astro/354-north-avenue-53-11.C-3vYpov.webp","/_astro/354-north-avenue-53-13.D9eu2Tbo.webp","/_astro/35556026ab54109ed477386c1b6db49df4e01503.vbooBDav.jpg","/_astro/354-north-avenue-53-14.2-Wo8z7C.webp","/_astro/360973f7a002089c1a7badff5ebef5d5413daf5d.CAesQCRM.jpg","/_astro/3593f811ebd4bf1828db47b83b6c696fc050b220.C5HZz68h.jpg","/_astro/361-n-citrus-ave-01.BC-LpwJQ.webp","/_astro/361-n-citrus-ave-02.Bh3MLyIp.webp","/_astro/361-n-citrus-ave-03.DGZHtUHy.webp","/_astro/361-n-citrus-ave-04.DkZe3rlj.webp","/_astro/361-n-citrus-ave-05.lVFMf8Uo.webp","/_astro/361-n-citrus-ave-06.F0UjP4nV.webp","/_astro/361-n-citrus-ave-07.A_40sWW0.webp","/_astro/361-n-citrus-ave-08.BXW8evnC.webp","/_astro/361-n-citrus-ave-12.FtL-dUXn.webp","/_astro/361-n-citrus-ave-11.DvB5UrH1.webp","/_astro/361-n-citrus-ave-09.imveXNzB.webp","/_astro/361-n-citrus-ave-10.C-qY8FlV.webp","/_astro/361-n-citrus-ave-14.BCzXn_eh.webp","/_astro/361-n-citrus-ave-13.H0rLiZOB.webp","/_astro/361-n-citrus-ave-16.B9GhcX8G.webp","/_astro/361-n-citrus-ave-15.BMhJ1BZC.webp","/_astro/361-n-citrus-ave-17.BoAmQGBU.webp","/_astro/361-n-citrus-ave-18.DlLxFJNP.webp","/_astro/361-n-citrus-ave-20.Bnob1LHw.webp","/_astro/361-n-citrus-ave-19.CBWbAeuv.webp","/_astro/361-n-citrus-ave-21.Db7650n9.webp","/_astro/361-n-citrus-ave-23.D-l-OGGo.webp","/_astro/361-n-citrus-ave-25.DWYwEtmK.webp","/_astro/361-n-citrus-ave-22.gEMY9Wrm.webp","/_astro/361-n-citrus-ave-26.BPsIWapC.webp","/_astro/361-n-citrus-ave-24.DvFQ1R4O.webp","/_astro/361-n-citrus-ave-30.DLvxg-VD.webp","/_astro/361-n-citrus-ave-27.CeJqNShS.webp","/_astro/361-n-citrus-ave-28.upFiEYvP.webp","/_astro/361-n-citrus-ave-29.l67CEMEt.webp","/_astro/361-n-citrus-ave-31.2XJjqaOG.webp","/_astro/36b6099670d4f744107a3a8b65fde25ad0f71d5e.ChTAlA7d.jpg","/_astro/36c9612e9a8f390f49ad7851b184f0c81585ced6.Cu9US0Wl.jpg","/_astro/371-377-north-st-andrews-place-01.BWnNW2H0.webp","/_astro/371-377-north-st-andrews-place-04.DYjP9eaC.webp","/_astro/371-377-north-st-andrews-place-03.CEpKNEpH.webp","/_astro/371-377-north-st-andrews-place-05.DomrxQ-Q.webp","/_astro/371-377-north-st-andrews-place-07.oiT_7p5i.webp","/_astro/371-377-north-st-andrews-place-08.B9gPv0y9.webp","/_astro/371-377-north-st-andrews-place-06.Cn-pHtCz.webp","/_astro/371-377-north-st-andrews-place-09.mI25TaRZ.webp","/_astro/373f828c8156572730fc2dc0c65d7e0d96c433d3.CIaPsgOp.jpg","/_astro/3755-s-canfield-ave-palms-01.DzzMBLiX.webp","/_astro/371-377-north-st-andrews-place-10.DZ4KaOUa.webp","/_astro/3755-s-canfield-ave-palms-03.CiN3FnC5.webp","/_astro/3755-s-canfield-ave-palms-02.D4qPEIHU.webp","/_astro/3854484de44acecf08039794c52c86e1d120b553.Bkx0HMaK.jpg","/_astro/375c12d301af2e0e1207529958f91c9f929e4bb1.HhgEXSeB.jpg","/_astro/383b20ff4c519ce07db2b8aa0e68da871140bc9d.WUHDG_Qb.jpg","/_astro/37a2e0ad978bfd58f95fda2a7171f7305d4e4563.Cr12Vfcq.jpg","/_astro/38664400f28f01652fb710dfbc4c573f1fcc1a3b.BsZ3RI2d.jpg","/_astro/3938560e6ceb11698e90ce9daab9302d827fddae.CLuwrIh4.jpg","/_astro/3926e9ab9dd55da1e8a6d37a5ddbb8e780290646.DDfebHe4.jpg","/_astro/3929ff4240094891cf7e05e41864a64c6458d645.Bt-bUUyD.jpg","/_astro/3967-beverly-and-friends-04.UBntHZQz.webp","/_astro/3967-beverly-and-friends-01.CBF3LpT5.webp","/_astro/3967-beverly-and-friends-03.Dzsz2QhO.webp","/_astro/3967-beverly-and-friends-02.D4fiLoMa.webp","/_astro/3967-beverly-and-friends-06.ZHpitOoR.webp","/_astro/3967-beverly-and-friends-07.D2Sb1d4z.webp","/_astro/3967-beverly-and-friends-09.9qvzPvWB.webp","/_astro/3967-beverly-and-friends-05.Dsweg8Ty.webp","/_astro/3967-beverly-and-friends-08.YKthsbAw.webp","/_astro/3967-beverly-and-friends-10.Btd8xjr5.webp","/_astro/3967-beverly-and-friends-11.CH6q_yrS.webp","/_astro/3967-beverly-and-friends-13.D_lYnR6j.webp","/_astro/3967-beverly-and-friends-12.BMK9Ay0n.webp","/_astro/3967-beverly-and-friends-15.Bri6ttlC.webp","/_astro/3967-beverly-and-friends-17.DZCoENHX.webp","/_astro/3967-beverly-and-friends-16.BaBW92J0.webp","/_astro/3967-beverly-and-friends-14.C_pLtOqE.webp","/_astro/3967-beverly-and-friends-18.C6fQh15n.webp","/_astro/3967-beverly-and-friends-19.CgYHpHzE.webp","/_astro/3986fb6d421ca4d5212ac6774f15ef89e89e6102.pPhMw380.jpg","/_astro/3967-beverly-and-friends-20.ReI_AZeV.webp","/_astro/3967-beverly-and-friends-21.B7x2sVLC.webp","/_astro/3999f5feb974c940c7902d2953f6aec93ddaee33.umIv2_fJ.jpg","/_astro/3a526e3a1ed4c95d482bef94077f2395eb0af66e.BxYGMIGG.jpg","/_astro/3a3370c3c02aa32a3aaa737382fe6968136e5c02.BWVWCBPr.jpg","/_astro/3ae6d7dd144c745985ade21bbc093c86969843be.B-zUzdl1.jpg","/_astro/39afb494503c384e0ad751dc2a6cc91a2e336f64.BZMI98Ed.jpg","/_astro/3d59cb017c2fdd8637df5d16d50d9723f1aa1268.CFnEyLh-.jpg","/_astro/3c306a30e1d15691f90dc2231c258997e3da41ac.BsYJvLza.jpg","/_astro/3b77bb84937e0b8f7c6eb2f720320cd7c2e05ad9.CqCztJ-e.jpg","/_astro/3d86d57ecda90ef56044398db09e618ec4fd89a5.Dm5LZbyL.jpg","/_astro/3f3955e591640ce1bb16c838209eb64cd5e9b889.dQa99ZWO.jpg","/_astro/3ddc2d9d7f5eefaebe3232ddf61f3848138f1fb7.BuRG7bVM.jpg","/_astro/3f5f21d3a1d7a82e046040ae24d53f4c83f09dfb.hM91isqe.jpg","/_astro/3f6ba97ac996bd4762e9b453264267f9487ffc64.DUR_qZGj.jpg","/_astro/3f71e8edf2f6be4eb5bbcab6b86ab1c1fe06d744.Bn7xdRyl.jpg","/_astro/3f01e28ef30bad5271d2be38b129b2b005ea7774.UKgWMrgN.jpg","/_astro/3fb4dd1dfded7fde19325d40051d0043cd5374b8.B5gRuvE2.jpg","/_astro/3fec1dfacdecfc8fa05c7a35cf447dd8b9c21518.0XA-aJeS.jpg","/_astro/400cc671a54280e351bc554e8793ecbc1a6067a9.3J25PTic.jpg","/_astro/4082ea68b138eb29b7397c0d91c4f32b2a2efea0.qp3_gySp.jpg","/_astro/40be8217450cac7afee531d1a0e5e0f79f4ac13e.CMR85sQB.jpg","/_astro/414e969bea5f4bb1e2e9d6502dc15edfb0f3016d.BypHq_FD.jpg","/_astro/41dd2edb5c70f3686c58ee77fb586d0cb3a160e1.Dj8Go5CO.jpg","/_astro/41385e9ccbd08d7ecfa807284c57ae110d87d976.BxVkc0Df.jpg","/_astro/418cdc84a1341f9a18f52d6039d4507f5d4a8673.D91ZPx8G.jpg","/_astro/4201-s-crenshaw-3600-w-stocker-03.Css5VNHd.webp","/_astro/4201-s-crenshaw-3600-w-stocker-02.ZAiP7C4F.webp","/_astro/4201-s-crenshaw-3600-w-stocker-01.Cf-4g1hV.webp","/_astro/4201-s-crenshaw-3600-w-stocker-04.CaYW9Njy.webp","/_astro/4201-s-crenshaw-3600-w-stocker-05.B0gKaf0U.webp","/_astro/4201-s-crenshaw-3600-w-stocker-07.BOnvp1mw.webp","/_astro/4201-s-crenshaw-3600-w-stocker-08.CJQtrvlb.webp","/_astro/4201-s-crenshaw-3600-w-stocker-06.42BsIsRA.webp","/_astro/4201-s-crenshaw-3600-w-stocker-11.Cxjc5JHO.webp","/_astro/4201-s-crenshaw-3600-w-stocker-09.MnDn4LPJ.webp","/_astro/4201-s-crenshaw-3600-w-stocker-10.BeHCp7yu.webp","/_astro/4201-s-crenshaw-3600-w-stocker-12.BzS0b_Vu.webp","/_astro/4201-s-crenshaw-3600-w-stocker-13.BVT8c_dU.webp","/_astro/4208f6eb05700578ad62ad168eddbd1fe6d78eb4.qfWE0NZ4.jpg","/_astro/4360843ba6e50d78ff6c1dfa7aa3f79c80e20960.CRUXoS2l.jpg","/_astro/439d7a74cc2b1a8a00006fefa0f96dcd8710dd68.BOj_pard.jpg","/_astro/44215866c8e59aad27ce74409a781216e7c17eea.CYyklc7F.jpg","/_astro/4459bb0f1b1cd755d175ec1a99872c2b280569a6.C3eetwZ7.jpg","/_astro/44459f71b9b783bcbf818752adf6dcc037985b36.B07sZnu3.jpg","/_astro/451fff059381f12d422a9b26d2c2291d2762565b.D92WzHzq.jpg","/_astro/444fd89b2596d481a052bde1c837152091348228.BHhB22Tv.jpg","/_astro/4544-los-feliz-blvd-02._-lIeOb7.webp","/_astro/4544-los-feliz-blvd-01.viIpQxd8.webp","/_astro/4544-los-feliz-blvd-04.CRoIiE_6.webp","/_astro/4544-los-feliz-blvd-03.BHKQ9dLJ.webp","/_astro/44e28cfb46a3fb73cedd66059281b895c1b043ce.BsZ2rCID.jpg","/_astro/4544-los-feliz-blvd-06.ProjcPN9.webp","/_astro/4544-los-feliz-blvd-05.BPDFlz5l.webp","/_astro/4544-los-feliz-blvd-07.BGUZFm4C.webp","/_astro/4544-los-feliz-blvd-08.D_KoqjNO.webp","/_astro/4544-los-feliz-blvd-12.D5JJk_pw.webp","/_astro/4544-los-feliz-blvd-11.D_dTPOmV.webp","/_astro/4544-los-feliz-blvd-09.D-KSCk3i.webp","/_astro/4544-los-feliz-blvd-10.D-6gFUoj.webp","/_astro/4544-los-feliz-blvd-13.DONuaaxJ.webp","/_astro/4544-los-feliz-blvd-16.D9SYNO7w.webp","/_astro/4544-los-feliz-blvd-14.kZIHBfj3.webp","/_astro/4544-los-feliz-blvd-15.DS75kW9v.webp","/_astro/4544-los-feliz-blvd-17.3ExDa9Ih.webp","/_astro/4629-4651-w-maubert-ave-01.C5IZg7Zy.webp","/_astro/4629-4651-w-maubert-ave-03.B8AGqzFM.webp","/_astro/45837a6b782488296a883eee774ccc6f4f61a844.DGIXnEB9.jpg","/_astro/4629-4651-w-maubert-ave-02.BdRUg2HB.webp","/_astro/4629-4651-w-maubert-ave-05.B9JhXXxc.webp","/_astro/4629-4651-w-maubert-ave-04.CWS6UuGY.webp","/_astro/4629-4651-w-maubert-ave-08.91Q-uJTz.webp","/_astro/4629-4651-w-maubert-ave-06.BpuzhprD.webp","/_astro/4629-4651-w-maubert-ave-07.jueAzs0D.webp","/_astro/462a1df312a402cacbb5eecc9216234d6ef038a6.BdappykD.jpg","/_astro/4629-4651-w-maubert-ave-09.CSiszE2w.webp","/_astro/484ccc5aa08d907b96e98d58aea3f67485542582.CspOgJ88.jpg","/_astro/4926b4edf633a56976b11dd4d08668f83b187b19._D0DM7y2.jpg","/_astro/48d4f1c3623f44176387468a6678f20968cdadb1.xK8HLKVI.jpg","/_astro/486d7caf369fbc903cae371956b5671b1603869e.Bi5Hd8T0.jpg","/_astro/488033aab876a88e930eb7a794f4b7ec288d0901.6qXT21qb.jpg","/_astro/48f0cfc72708226343bd158bceec4bee54854fb8.CWL6-BmZ.jpg","/_astro/4954ee905de6174fc9a35a958164152b99ef4fa6.uSZnOZCd.jpg","/_astro/4a74cd56b53964caaeab2a135c15b97506a48ea5.Djt0N0vu.jpg","/_astro/4a2f96aeecfe6efe36607b87dcd06bb138a3dabf.DiUg8AwK.jpg","/_astro/49c4b321503e6b66930b8198e0fc69008dbd2526.DsaG1tAt.jpg","/_astro/4a301cde81fc5ebe8b1a1a1c44ba27116108c92a.B3DYXaJp.jpg","/_astro/4ae54f451a71d7ce4c95b1bdf49309775a507616.C3zZNI-g.jpg","/_astro/4a7c28ba1b6fec10e5bcd2c15012d11ed7a77118.BEifylDz.jpg","/_astro/4aec3d5de760392dfb2149f3e5e3e58ff6b0bf15.CKMwXDWL.jpg","/_astro/4b0113931b283e6bf3a647b39c19cedde11e7ccc.D0CgJM9q.jpg","/_astro/4b6da98d0791cd79c5afb91cf7aa9c3abd2e1026.CkWkSo3q.jpg","/_astro/4b75cb3d77ab657e50e2325b29d5a014a00f2418.DNnrJaht.jpg","/_astro/4b99d1da59036005a531a5c743848966f3f085d8.C0Hby4ui.jpg","/_astro/4c3bbe5879af069e2826400cba6f8c38123465d9.Dne0JyhW.jpg","/_astro/4cc3cdc6571a43af17be01331cf80135c4691959.BaCb4K1w.jpg","/_astro/4da550f3c078f5373112b2c72dd9cbaba5a419e2.BrnJmmoH.jpg","/_astro/4cad8119cfbc63dae6772f3e064dd8e85047d018.BmRBDULo.jpg","/_astro/4e11973009ef84cf86204b9f66ed15678f5acd96.CxcAGnFt.jpg","/_astro/4f20ab9764732099677f964040a5226718f0925c.2E6gC6tV.jpg","/_astro/4f2bf90bb8a62f4296018b912198f9a608dc871a.giphy7CW.jpg","/_astro/4e55b1b788993e89b51c9ba9edeaa9e8fa79906b.BVv8Vx-q.jpg","/_astro/4f696ab0ec7e99108fea25bf3010ffff80f160a3.BZIE0khe.jpg","/_astro/5012f6783b31617675656473a4d1f44a40e858af.C-1UxKZH.jpg","/_astro/4fe292862704dd364371241d8a7d261d27cb840f.C5AKKseE.jpg","/_astro/4fcee216ffcc8cedecfb27b09c739b4f75076509.B2AM1H6h.jpg","/_astro/505bb90ac0262de5bff3a50ee727998d00265aeb.LxDLcnen.jpg","/_astro/50933581902fcdf860d117f1fcd9cb59870bf39c.D1U2eqHW.jpg","/_astro/50931bef15f3ba736931bcc349f05c2bf4b79000.DjgX92ZZ.jpg","/_astro/518264f79e083126af55204c6d7dec89e202af30.g8YhKtOy.jpg","/_astro/52473c3faf562f02d4002b09ee291a999e861125.CXpgIdUT.jpg","/_astro/5201d922d12b00224f139f4e0a29d22099ec6655.CQhTakUF.jpg","/_astro/52c1b0fbcb86ea9d40c62042ed419687c8b451e8.BYGSHnuo.jpg","/_astro/532f9126666f44ec0bbaee4aac9cbca3d4541af4.Bx344m61.jpg","/_astro/538b6804f5869ce30c2419a4943dbc8c7435c098.CeW-MXuW.jpg","/_astro/536dd03e98bfeb51b7e41269a102afc4eec1223a.CePb6QG9.jpg","/_astro/530e6f40feffe0ce84f37389445702aac59706bb.TeAc9hRD.jpg","/_astro/538bd0a025fa39d8d56aa5c2e247a3bec7029757.sZdftOzw.jpg","/_astro/54d4bc9dc4c2d118146cf441a0a03545993513a1.jIaGk7uH.jpg","/_astro/53d207a3b55f4141547d38d5920ada915f6459e8.BL8IDv7S.jpg","/_astro/53ac5a92bff89595a1cbd98ff76afca197e32a6b.OWe9wr1g.jpg","/_astro/5584c0f7d91830bb5c174e6799c1644cb257e386.C6JCFr4J.jpg","/_astro/561251beef0440ce75712ae522e8961ee51505d1.8t6fzWN8.jpg","/_astro/56a6b684fda56e1557132616a04b82c3ad4813ae.BaHAHdYt.jpg","/_astro/55ef97295187132a98a134f01b070b3f31442a54.CtZ2Oef_.jpg","/_astro/567bd8b3814a8f6fea81e57aa2e6dd83f9a97c96.Dag31y76.jpg","/_astro/573ef03cfce70d47e3509e6b814009e305989525.CkDh4su3.jpg","/_astro/5760c27df6a38c4e81cf1d456e4773d87b3c2d29.RbpZWOXx.jpg","/_astro/575a5060d3c57aa2b30a2e8c2c998bdaac23f28b.C-f8TWr3.jpg","/_astro/57649e4521b5434044c245e39826c216c2ff68ed.Cw__f_JL.jpg","/_astro/5765f63f65718a148f71ff42702bc032be82bd06.BeuPw26e.jpg","/_astro/5750aa5d4e6a309adefb34cb76292923bb5ac326.BU4s_LhJ.jpg","/_astro/57a9201542d9e7094735cb821ad11446ead4b86e.3UDGTmwo.jpg","/_astro/577c824625932961663503cac4faea9bc1a3dca5.CmMQDc-6.jpg","/_astro/581978db08bae445de5fe60f0831c15b65fc976d.BC4FcQxE.jpg","/_astro/57fa864962dcd3471ec2aaff364780f21329558d.DWzRitaW.jpg","/_astro/59412de0a996fa3bd379e56582b8a9d3d503190d.DA1mzAfm.jpg","/_astro/594ff909484cb3705999c5426d1ce25dc2d0abed.BkF-Nw4n.jpg","/_astro/5a104c32c0426444232fac3727b084d3a22b8059.CJfpzaki.jpg","/_astro/59fca437c14406ae830bbf6ff883cbf221d20753.D08auYMH.jpg","/_astro/5b2152d02d767b2d134719850f3e84f785a1c7e0.BKdt23NW.jpg","/_astro/5c675adfdda4f7a3b4645dcf34dbc3fcf0772676.vSw38MP8.jpg","/_astro/5aba9fea86996f63debab4a313aaddd02f885070.BktNbnZe.jpg","/_astro/5bc81d87e97e8ef3764fdb599d639a089d190439.U-PZ_mr6.jpg","/_astro/5c9c56aed69ab469cc1c482ca373f678ad20d47c.DoW2L-zb.jpg","/_astro/5d1496c54caf90b4354c4526929ddb25fa4bf7f6.DNhT3iU-.jpg","/_astro/5cf9d8e52ac5802cb5c0fd2820aeac5bf25a1e28.YypYB5AC.jpg","/_astro/5ee1a43e3b595562ff9fad11158a7b51c1a8b224.HSGKgBpU.jpg","/_astro/5dc80fa61ffea96ac1c2e154432aee8419593ef2.C0kEtvul.jpg","/_astro/5e7bde9182e2b6b8ad0a012984ebc50b00cb32c2.nDBBGPIX.jpg","/_astro/5f112bfc91e716d7b8237b985d2ce7c25b6054ed.CVxsu_zV.jpg","/_astro/60de06bd5f70d312ac01fe8786d24a6351342229.DmJxMxGM.jpg","/_astro/5f286255883db528620fb33d5d58cf014ba16116.DOExrK9F.jpg","/_astro/6035301a83fe22aff666605b2e02f49cd6d68514.CCzx5Edj.jpg","/_astro/6242dc65ec3c174cb2d3abc2f12cc4ab4c9f87f4.8V8NZ1Lc.jpg","/_astro/616a00ec32573bc88b734e7f3ddec47ed85bde08.CLkB_tJB.jpg","/_astro/609d96b8ce578c30036c9b4a3543b5d58cda2561.CDTFmHP7.png","/_astro/644b7d8f301b8525548650f00b3598227a67b048.CrYJEyc3.jpg","/_astro/62a04704c234b006c3617a2453035ae20427b28a.Cvj2d_aP.jpg","/_astro/6306b31da01aa9599f8888d8b70134d29ad0f0a5.DVDht8E7.jpg","/_astro/645e86aec38355a1dced110c9d8068c2fccb6ce1.B6FOquCR.jpg","/_astro/63677d1217256c1ffb1467dc5f0254cf2ec292bc.KBpukBKF.jpg","/_astro/651b66d936d1f59920a94edd5f7281e23ea7a17b.afEa__Qv.jpg","/_astro/656cd6832ec1ad4ac0d4054830d63646e9059d7f.Ba1orVq9.jpg","/_astro/657d204a215d59f3443c944b417a62115f5407af.BejFXE-K.jpg","/_astro/66898ffa77e75405873f1894a7eb01ca8fe9aa70.CIrobHqi.jpg","/_astro/669612a73949304ce998cca15a148d1e8257e54c.Dod0w-kV.jpg","/_astro/670b2603ae4e5cce468840f0b8bfb15a6eab02ad.CBmcJifF.jpg","/_astro/673b068779c0540708e989db66b5cf1ff09cba49.D0im-WCM.jpg","/_astro/6746c4f1cd0c68b119fcec71999f9674f5dbda3b.7AbAwtzZ.jpg","/_astro/673b53f245ae2e167b31a3521ada19d0e68d0b5d.mGSveZnd.jpg","/_astro/67e387437a1a302f5f148af16f2378347f48cf5b.0gmC_RL8.jpg","/_astro/678d76193a182514d2fe0db2eff2fffdbd0a5509.ChWwB-6y.jpg","/_astro/6833f19137db4c5376110d6d19bceb9e29d1b915.WZzr4rmh.jpg","/_astro/68a0085a4fcf8a57a637d7551441127537b22750.bLFZoony.jpg","/_astro/6979852423df123758be7a511bd80e0767944ef9.Ca-yAi4C.jpg","/_astro/68ed41bbbb26542c4033d13cb3b8bbdfc041445e.-tYqAiQm.jpg","/_astro/69c90c12fcba4c93ee5446bc4722010673cae384.BlEOIQi1.jpg","/_astro/6d2d1f10505361bb3aa1935f29ef15555db509da.DMnFV1kf.jpg","/_astro/6dc53ae2b0ca2b9e59978875a3d66743306ddf3b.C6BXvUIq.jpg","/_astro/6e7281dec47e1c6aeff5d2e42e9541f0b7154187.DF3wyTYC.jpg","/_astro/6f68044ba69d343a801623bab3e549eacd46807c.BNtFYsqq.jpg","/_astro/6ead3f58cacb15f208e66dde33009f923aff9626.B-Qj8xit.jpg","/_astro/6f3c1c9c7fde420927658bc978d812c3bacc794b.LtIJp4pz.jpg","/_astro/6fdbe2e2cff8a26b26c1fd443f903779fb7faef0.DniM_Zu1.jpg","/_astro/6f6de4851722a521455cb0b5dbb8f973d3e9fc55.BTfHlr0g.jpg","/_astro/70e670e833270857df998599e39ad3af4564ed53.I0lj7iQ7.jpg","/_astro/71b039af5d00b141e63f2d7afff86c65de1799d3.CLQHMs3F.jpg","/_astro/71cd04bfade4a7a3ea7e23ef6a58bbbab80ec335.GcU2_cqx.jpg","/_astro/6a81aba31cfdeedfe0ece088d9f20a2db6f2762a.B-8Xo7nj.jpg","/_astro/721512f15e653e1d7dd2ca933c473269e61abfd1.BotxEr27.jpg","/_astro/72c79f7ebf5b03a210f6e7884aeac80074591c02.-gyqUlHE.jpg","/_astro/7409a35269d93a64e0c6baaca2e7f27b42db60b3.BVvIvI5q.jpg","/_astro/7421196c52005d78f02dd25232d81215f979bbf4.C4EHxQzV.jpg","/_astro/73bf5d05fb9cebe65afbe75dacef5bee4227cea7.BmgQqm1U.jpg","/_astro/7462e9a44dbe3c92546c65b759030597827cc5cc.DPcViPz2.jpg","/_astro/75374dbabf9eb1d7f5cfe01373a941c025abc6cf.Dk7bJx3E.jpg","/_astro/755f5913d2bd65480d04e70a70c4c732cfac95d5.BeTsEcO2.jpg","/_astro/75ecc07c6378c9fd592078d776da8036b46adbc5.BNIQhyjj.jpg","/_astro/75f12815b5dd1fc4cdbc654376ba70e6ed3afa45.DS9wT21L.jpg","/_astro/763837e2e5b0742dd630c3606ce077354308f26d.C-GoAxSy.jpg","/_astro/7635f00064a23c7bc34cac1788f7068a9cff511c.CD9sRabQ.jpg","/_astro/765aaa362485d08be35b85c6ef30dbea8798690d.kIkmsNIX.jpg","/_astro/7693332ec30951c4afb4b7ff8eebef6f8ac75568.B_499yni.jpg","/_astro/76bd61e9d13581af6d59279f4a5c55a1ee065bb2.zLmM1EQ1.jpg","/_astro/771aca673c6bf6645a61b9d63c82799c78bad91d.D5kb1kdr.jpg","/_astro/77646d19d97712106186cfb184c090d79f4c933a.-SdQSIuU.jpg","/_astro/77a3366045845fef65c35c42bcd7af00b580d9c1.5VhtQF20.jpg","/_astro/77ad34a48fd6f6953216129644d8f6df134a2edd.DQuq61Km.jpg","/_astro/77bb5e5219026a5d5ae4865e6bf97c7c3754bc92.DUwocKXk.jpg","/_astro/781bfb9872fd697754521ccbadebe89fd7981b4e.CglQ2g7O.jpg","/_astro/783a693d5e1400fb72c23a7c8ccc8b5ad5b7888b.RF0CxRHF.jpg","/_astro/786053dc62b413b5392eaba79f184fb1aa90a454.CuwNxg9S.jpg","/_astro/78bc2a857211c033fa01d4d9d6fee2f1d55446f3.WZhJT1MW.jpg","/_astro/79195ec2fcd7e7b0c96a740f16c8dbeaf29eaadf.C9ntaTt7.jpg","/_astro/78e4b7af2baa39d9b2ae00eb556cbaf12e8ea76c.DlJId03L.jpg","/_astro/79545bb4a8acb98f5818d4cb86059012236b6c1e.CsosGzji.jpg","/_astro/79dadfa7267a6a4c01f1742854cf14638b3d8ebb.VvF_2Xuz.jpg","/_astro/795bd46c5935820a97e18e0269c0028f6ee4d49a.D6DOzhQG.jpg","/_astro/7a5252dae95d684dcc064902e5d8207e15f6ad18.TRhBWXw8.jpg","/_astro/7a02ee23e7ab94f923f7cec8fc1256faa5f35e33.C6sKkG5o.jpg","/_astro/7a5814b6fe19cd2fa832105e4097e04510f2ef46.Cu3Fvu6-.jpg","/_astro/7aa4ac04f6959927b1d58e2823930e0718460bbd.WrHLB3w-.jpg","/_astro/7ae94e9d83fb51d3801616840352ad20a7db0a79.BUAuAig_.jpg","/_astro/7c1a441ee887bac9f45d41539b3f3aa1a134734e.CTx0BGUy.jpg","/_astro/7b0b255e458052cf256fd1d833a5fcc6850b322a.Cnv8MV_u.jpg","/_astro/7d5643ca723ccdd73524933f0454bdcf6d0b7f29.Cnk5R63X.jpg","/_astro/7d029bd7919c473613dce1b607efca4f82f439e6.BuyLCUtn.jpg","/_astro/7f1b796236e6d465a3ca2d304e0543fe13ec4edb.BzdmLBb9.jpg","/_astro/7fb848329e71eaea6995c74cfe9d3a5e05a28a9b.B-A23xYK.jpg","/_astro/7f481c4c7fd4c455d38b7c42dd4c39f7e8bfeced.DFXKJJr-.jpg","/_astro/7fc8b9cf25461dfecfd3337c326fbc8e9a682f26.CqGic4ks.jpg","/_astro/7fcdaef7096b9ab5dac12ed1043dbfebc3c25939.NsrWeskZ.jpg","/_astro/806ad3c28bc6d4ab9b1ebec2310688a882dc2d05.DOq5il3x.jpg","/_astro/80784c24f505389073ef00b405e6fa8fd132b7f0.TUWZXlg9.jpg","/_astro/814b9b2ba78b1bb587efbc1949392fdd88650d3f.D_XSMgIg.jpg","/_astro/80c866a42f3cec2a8b3e142d636b42fddb53417d.CrFk5qMg.jpg","/_astro/82ec7788f0942a889d3c532658c99672c73ec7a1.jf2iM-yU.jpg","/_astro/8226542a1d631a60d41cd97d089a5665824ff7c2.DrXqVBju.jpg","/_astro/83007e7464bf1472d2af1338d10a90469cc03423.B1WR2Tih.jpg","/_astro/830634fd6b0046801801e7a4c9bfa84ff819ae67.ARc300tw.jpg","/_astro/831368c9b4b416b33d9f09b70a432397a6259c2e.DnC8Yg_P.jpg","/_astro/8327c135ebc45d0975237b65f7f387e5a4f0ab33.q448O3rQ.jpg","/_astro/83b93e7026c535fe5161c9c0178c261e4f997474.CzV75Top.jpg","/_astro/83ef52a8492a9672648f8b73a0e124b684374bde.DD1FuKfI.jpg","/_astro/860ebb1def519396de04990f371cd965724dac8f.sU7nOrcc.jpg","/_astro/863f53c01a150af7affc97c2616f0c3799a479ad.F32jG03P.jpg","/_astro/86b15a08ded276b36365fddb6491ccaa47725ff4.B-jVLMJD.jpg","/_astro/87903d5bacb5196c5a40948219d61b63b3c04afb.CHZ-gQK4.jpg","/_astro/884436eb153dd44fdc0bb998c457360485891d32.BlrF-tLP.jpg","/_astro/88712a23586aeb178999214ebbbcb47f9511f218.CiJEw73Z.jpg","/_astro/890af9b939667ac168431c5758d6467bc692b267.Copp9W6a.jpg","/_astro/8936146147b8426749d461993b0ccf43ca482c8c.CjRax_1B.jpg","/_astro/8a23ea3ba0932681a6a3e4b21935602c1e45dc0b.DAngnEhc.jpg","/_astro/8ae468f03e222f2a6b72fde53c495a3a2ff3ce17.BvWH-ekg.jpg","/_astro/8b4f38f17a4110fc2a6d7addfdc1064f6a30690a.CawXJbR3.jpg","/_astro/8bda81ac41679ce542fac0f64a273696828debf9.Cm8UWK-v.jpg","/_astro/8bdf1d837e2b3534f3c59a346d251f9e4ec12d2d.d44V6Dgw.jpg","/_astro/8bf59d7197a4a4222b55638cec39f011846d0e30.Das1l9Ug.jpg","/_astro/8db6bea5ce3324675d925ba23a1de57d29c9466a.BZ3-w1ik.jpg","/_astro/8e05cca047874735b83eab147ad941c0471341cd.J7mOVYD_.jpg","/_astro/8c88a6eafd1f220f977cd72ca42a919530e118b6.BjVL5u1J.jpg","/_astro/8e2eaec89d86d0f53cef52d03511a8c3fd5410ef.DwePfj99.jpg","/_astro/8f6923eff64802d051611b3ce4a484cd2e80b771.DLccyovu.jpg","/_astro/8f5e78eae77486f9fbb599339007232a72ab6768.rRIWdJ_l.jpg","/_astro/8fbd12b029ee53e3816d47f8ca6c4d3238b952cc.AlkUJtV-.jpg","/_astro/90550990f44a1d9d8e7649896fa2745f8fbf30c4.DiqJ_SsI.jpg","/_astro/910352ae5f1865407c0b0f1775334564cb89bea4.DVfuKhEG.jpg","/_astro/91d01191ee54ec00ea3a4df5d4a5757fb6a08058.DvPYA73N.jpg","/_astro/91ce6da26d36c59eb4379613f2f3ad42d3c5c042.DiJMvY8I.jpg","/_astro/91fcdfe3e4acf67372a5161f44fe0f53c4ab8c37.Dz0ZEDJ1.jpg","/_astro/926-932-938-so-kingsley-02.Dr2W8ejm.webp","/_astro/926-932-938-so-kingsley-01.Da-BzC2S.webp","/_astro/926-932-938-so-kingsley-03.DMJVjXUh.webp","/_astro/926-932-938-so-kingsley-05.Cx73ydNd.webp","/_astro/926-932-938-so-kingsley-04.BasZ8kDa.webp","/_astro/926-932-938-so-kingsley-06.DcVb9NZM.webp","/_astro/926-932-938-so-kingsley-08.DGplZPD7.webp","/_astro/926-932-938-so-kingsley-09.B0QFR8Xm.webp","/_astro/926-932-938-so-kingsley-07.D-BmyNXL.webp","/_astro/926-932-938-so-kingsley-10.C8QILrb-.webp","/_astro/926-932-938-so-kingsley-11.l-7AD4v2.webp","/_astro/926-932-938-so-kingsley-12.DGNRloYs.webp","/_astro/926-932-938-so-kingsley-14.CNa5XXne.webp","/_astro/926-932-938-so-kingsley-13.UBmq0c1x.webp","/_astro/926-932-938-so-kingsley-16.bfwuSDqw.webp","/_astro/933-s-gramercy-pl-01.DXMqWvTW.webp","/_astro/926-932-938-so-kingsley-15.B_9lxD0H.webp","/_astro/926-932-938-so-kingsley-17.DS0mOXgv.webp","/_astro/933-s-gramercy-pl-02.gVId3U5j.webp","/_astro/933-s-gramercy-pl-03.TNhN9EAX.webp","/_astro/933-s-gramercy-pl-05.B_IMbaQ6.webp","/_astro/933-s-gramercy-pl-04.CDIJzS1f.webp","/_astro/94d2e5dfd04d674d2fc6554e7b4dfc587f043ada.tuUTbwgB.jpg","/_astro/933-s-gramercy-pl-06.DQipKr3y.webp","/_astro/950-s-wilton-place-01.CKRd190a.webp","/_astro/950-s-wilton-place-02.R_LYCw35.webp","/_astro/950-s-wilton-place-03.Bp-9ToRJ.webp","/_astro/950-s-wilton-place-04.B8ZeS64t.webp","/_astro/950-s-wilton-place-07.CTFeOZmf.webp","/_astro/950-s-wilton-place-05.BUucXUg7.webp","/_astro/950-s-wilton-place-08.DbLtvIOQ.webp","/_astro/950-s-wilton-place-06.C5zwo1ly.webp","/_astro/957-963-and-967-arapahoe-01.D5UWm5e6.webp","/_astro/957-963-and-967-arapahoe-03.BLOylEr2.webp","/_astro/957-963-and-967-arapahoe-02.CsogZTnJ.webp","/_astro/957-963-and-967-arapahoe-04.BtSnnEwz.webp","/_astro/957-963-and-967-arapahoe-05.BJk9j4M5.webp","/_astro/957-963-and-967-arapahoe-06.B6MIl44G.webp","/_astro/957-963-and-967-arapahoe-10.6nyfnOnq.webp","/_astro/957-963-and-967-arapahoe-07.CuBx2AmY.webp","/_astro/957-963-and-967-arapahoe-08.G4OY2Bqn.webp","/_astro/957-963-and-967-arapahoe-11.B2cEB2xN.webp","/_astro/957-963-and-967-arapahoe-09.BD0S2Dnr.webp","/_astro/957-963-and-967-arapahoe-13.YZPMfNqG.webp","/_astro/957-963-and-967-arapahoe-15.DRDr-eD0.webp","/_astro/957-963-and-967-arapahoe-12.CG72UNqy.webp","/_astro/957-963-and-967-arapahoe-14.Du5WseEM.webp","/_astro/964d4d2275fc16bfa3a7660dc1568ae93036c0e8.tFZ18id8.jpg","/_astro/957-963-and-967-arapahoe-16.DztXqtQK.webp","/_astro/9696747c53bfca2d19d2fb454910a914a06f6fc5.C_oMqTDU.jpg","/_astro/97c6820953bfa3ea203daf4ee0728bcfbee0ec7a.CHgt7XLl.jpg","/_astro/983bef1b954fd4169bc005cbc33376e1d216d490.TG2eiQyh.jpg","/_astro/981b3774de858221bb0e919342bcd9c4f81acf16.xXLj0BLG.jpg","/_astro/99a755e3a6bbf5899c60a87dafcb848da10e552c.D0MFjhb0.jpg","/_astro/9864ff904d043a7033b2c13acf85ae53ba5c7383.BAGYa-7W.jpg","/_astro/99d47db88dfb83b37c17cd581be40f82af4b0a80.RJ4JTu_y.jpg","/_astro/99d74c76ea01422df224298f324d38b5d815bd02.BQqRYHmT.jpg","/_astro/99e45c142a8e8fd77579d43d450258d8334947d2.CUHgpOp2.jpg","/_astro/9a0b9dae7dbde06a65788edaf0e92f0a443ca4bc.DjF2kUHe.jpg","/_astro/9b07816d64214391c281c131a7f59a53a0932541.BHLtfpaL.jpg","/_astro/9b2c89c2604017dc310dbe239251d5585a182ace.DrOfDVG_.jpg","/_astro/9b47d07a1c4b9bc32da06eb999cde23f78b66a67.DbE7gz9x.jpg","/_astro/9b3bb02276e6e80733de626ca6f35f4b045c98a6.BzkZRy3L.jpg","/_astro/9b96f248280aa4796a4e58bb28fb07a8802c8b36.oWRO_rPX.jpg","/_astro/9bb0259a039ef71f774ad7b62e74e26980d18d0b.21i6n4_n.jpg","/_astro/9c2ac10924b19f1b258e891704c3ac2728725025.D5V8AAV3.jpg","/_astro/9c6673ce2baf310e15ad5b143901f45bcc88b38c.VM64RRJy.jpg","/_astro/9c3382ba68e6129b40914ee84bf3744c8dd3808a.C0YrUnDd.jpg","/_astro/9cc9dce1612da77a75657d16e21c55cc29def765.CBO1kaOg.jpg","/_astro/9dc8bc8ef39739b8ebdcbc23ab342cac886c1ea9.DuKdtgF8.jpg","/_astro/9da74638150ee173e0f6642622c92c863be9c744.C-eoDWqw.jpg","/_astro/9d05fb24565f6154fc8d3239cbb40e5a95230b89.BBkrNBA0.png","/_astro/9e406fe1310c1dc825a54b4dd8dba531c26a12b4.CozPssct.jpg","/_astro/9e58368086e4d69a542c131172336e603cd510c0.KGYwJSAK.jpg","/_astro/9ddd97c5131825e4879c105308f0fc24019f1b72.tu9cM3uT.jpg","/_astro/9ed64c7c09b33c1092e1b6e8dee28550bdb3a209.B1vZPMA4.jpg","/_astro/9e92e162e2006f01f78d01c935e20f507138372d.D7IafRl4.jpg","/_astro/9f61a5efdc42e241623bbc15188fdc4bbc1f0833.DDXzi9TU.jpg","/_astro/a-word-or-two-on-density-01._zC_E94H.webp","/_astro/9fb60ce3a7783b1cdfd54d18f377b9fe2b9dd424.XlfIzCPw.jpg","/_astro/a-word-or-two-on-density-05.hjZpZmI1.webp","/_astro/a-word-or-two-on-density-04.DUbFg5PC.webp","/_astro/a-word-or-two-on-density-02.DaddIHYE.webp","/_astro/a-word-or-two-on-density-03.VyiT0Cf7.webp","/_astro/a-word-or-two-on-density-06.DYk0kEbr.webp","/_astro/a-word-or-two-on-density-07.LMSS30j_.webp","/_astro/a201a1b1b33320fd3846332fd5a82f3f2b9729a9.Cw9CjeE8.jpg","/_astro/a0cf8bd0c977c7f2c7486b5c731e77c4113225f2.B4iCzd6I.jpg","/_astro/a206e0e90e1faf613b534fd73853ad13ce392196.CB5mk4HW.jpg","/_astro/a2bce131bec2de85bea5dada607fd528a3c1715e.C9_PBVoW.jpg","/_astro/a24686642cc028d9b48a7de9d909d34ff4c839e1.DCWe6Qya.jpg","/_astro/a2d9125e4fdcd4fbe47c60a20af1195bf02de885.Ci0Jdnkj.jpg","/_astro/a2e936337f14f0eb103034f4983f2eaf32d51cfe.CBnp1ZW0.jpg","/_astro/a3a137273d0099820543929f962a472a5212d30a.CTN1ImmG.jpg","/_astro/a428b3399c01da031c12668495310eb4447acb00.DAeqr42o.jpg","/_astro/a47343d75186aead0c4e4f0f03b5bc043fda62fa.Dwk7LjCe.jpg","/_astro/a525760d22afbf6bed8d3f1286131e3a0f0b88a5.xCnAze_2.jpg","/_astro/a4df7e9fa3c433cc17922990318fc48a6b5ce1e5.CL4O18k-.jpg","/_astro/a4862512b68df5d8766a06e291992a9555c88bb2.CzlvgMEb.jpg","/_astro/a526543bf5d14d6a388fe139ef66fe8cc1d0f363.DAzGTWga.jpg","/_astro/a54625e5bf61a6a45fc46a955b55d6b22a69b247.CedSgvc4.jpg","/_astro/a5da2709dec5e703bacdc72a49cac2b96269480c.BuXRWzXs.jpg","/_astro/a567ad91e325c3b400e1f2d23656d6daeff24445.BoHaH61V.jpg","/_astro/a62a137f8901b1530cd31c0056c9c184b12e6775.BLYS9NCh.jpg","/_astro/a646911043c6c22f1c1a8f84e3ea989b35c7afd5.JB3txtQ2.jpg","/_astro/a81bb3eb729735b02412c9342824c5eded925fb8.CcXoLtdw.jpg","/_astro/a8c92b5c431765728021c84f15b3485bc41dd703.CcE8vhRK.jpg","/_astro/a90b5da90066676faaacf71e3a405c164e17a6d0.B6ZaiI8z.jpg","/_astro/a924b111faacb5441b4fb9ab9aff6971dcf0c1d5.C8SiGVPQ.jpg","/_astro/aa023c6586da6cd74e1a5a88cc3839770c8896e0.CNu-fzvL.jpg","/_astro/ab1cdfb759afb28adfead93060b00b5d60e93a8f.LlYXY7x5.jpg","/_astro/ab259eb4c4d7ee71ca80e6fecd82831838bff6ba.D-igGdot.jpg","/_astro/aad0902ed74837202e6cfcfdb285d940515c3cec.DOsz37Zt.jpg","/_astro/ab2fc2bfd767bceb9f1b01cc16117828201fc03a.DmT9dJWT.jpg","/_astro/ab801e37a2356c5d93fb132097241abf3060261e.DY5_QBBr.jpg","/_astro/abf78a465a38dd5b914db4de4ce67189cc990373.BtDkKm11.jpg","/_astro/ad55f6183cc58c9be2fb5694d57e2ef503ef9ae7.DitUTXDq.jpg","/_astro/ac72aaca7bd576bff42cea9dfa0da88720f37a4a.DdxJX4qy.jpg","/_astro/ac72a61922ec2d0a184bed85332260f67087761f.BimYObMk.jpg","/_astro/acd38a5d42328c18a25e19f8e98bc3370d23595a.BBtV-g1w.jpg","/_astro/ae326d15c0c20c00e0c322fc1882c1c549f74c47.CURrbJnf.jpg","/_astro/ae9bf6b033f6e7d3980b23435258e9fa125b9319.upzOPJrP.jpg","/_astro/ae723f4b939192a0980b7b35624c9445a07638e2.ChEb7yaP.jpg","/_astro/aecca11fc16b2561e9ba3baa52f7f2b902e308a1.DwdDtUUy.jpg","/_astro/aec104886e086df901fae176e5606546cbf26123.CGlia6Bf.jpg","/_astro/af0cb591c55772249fc2f057718cdefbb0c1ae3a.BNB-RBfc.jpg","/_astro/af3cbb2af00e5c91e68cb51ea383d2614e9ed565.BfRF34kG.jpg","/_astro/aff8caf5666eb1e4b827b08b9d88d088dc3bc134.Bbi3Ast7.jpg","/_astro/af48c2481cd2b04be1a0c64d18529e2c2adcb364.BDboIsX9.jpg","/_astro/aefc83d6ea5fc87cb23ea95d1fae8270db7cee33.B0k2zmfa.jpg","/_astro/an-appeal-to-reason-at-1537-south-wilton-pl-01.BzUD3ZJf.webp","/_astro/an-appeal-to-reason-at-1537-south-wilton-pl-02.GEUEK9RV.webp","/_astro/an-appeal-to-reason-at-1537-south-wilton-pl-03.0vRDi_Hp.webp","/_astro/an-appeal-to-reason-at-1537-south-wilton-pl-04.zRhn2CxG.webp","/_astro/an-appeal-to-reason-at-1537-south-wilton-pl-07.C2qa7vwT.webp","/_astro/an-appeal-to-reason-at-1537-south-wilton-pl-05.DL3wFKjd.webp","/_astro/an-appeal-to-reason-at-1537-south-wilton-pl-06.BWx54E1V.webp","/_astro/an-appeal-to-reason-at-1537-south-wilton-pl-08.EQG86A19.webp","/_astro/an-appeal-to-reason-at-1537-south-wilton-pl-09.Cpe2JsL0.webp","/_astro/and-we-re-back-01.Ctb1xyEp.webp","/_astro/an-appeal-to-reason-at-1537-south-wilton-pl-10.Dx_Kh1Rq.webp","/_astro/art-deco-pico-03.D1aMr-ns.webp","/_astro/art-deco-pico-01.BITUIOn7.webp","/_astro/art-deco-pico-05.By8TbFHU.webp","/_astro/art-deco-pico-06.B9WCEWe1.webp","/_astro/art-deco-pico-02.FrKeCept.webp","/_astro/art-deco-pico-04.DsJlALVF.webp","/_astro/art-deco-pico-07.mdd8u6_g.webp","/_astro/art-deco-pico-08.CuXV7xz4.webp","/_astro/b-nai-b-rith-846-south-union-ave-02.JL5lUrrv.webp","/_astro/b-nai-b-rith-846-south-union-ave-01.CVa58gLp.webp","/_astro/b-nai-b-rith-846-south-union-ave-04.B3JmQpzE.webp","/_astro/b-nai-b-rith-846-south-union-ave-03.CrwkEjok.webp","/_astro/b-nai-b-rith-846-south-union-ave-07.BEux6hwa.webp","/_astro/b-nai-b-rith-846-south-union-ave-05.D8B5riSw.webp","/_astro/b-nai-b-rith-846-south-union-ave-06.1Tj6mZ-1.webp","/_astro/b-nai-b-rith-846-south-union-ave-08.DqRMepCz.webp","/_astro/b-nai-b-rith-846-south-union-ave-09.BKfkb1u6.webp","/_astro/b-nai-b-rith-846-south-union-ave-12.BEa9WLC3.webp","/_astro/b-nai-b-rith-846-south-union-ave-10.D_ZJ8L1O.webp","/_astro/b-nai-b-rith-846-south-union-ave-11.DSrenksU.webp","/_astro/b-nai-b-rith-846-south-union-ave-13.D-CpiQbV.webp","/_astro/b-nai-b-rith-846-south-union-ave-16.DvvEyrn4.webp","/_astro/b-nai-b-rith-846-south-union-ave-15.BYE2jsGo.webp","/_astro/b-nai-b-rith-846-south-union-ave-14.Bh6Iif9n.webp","/_astro/b-nai-b-rith-846-south-union-ave-17.DopWJaQ1.webp","/_astro/b-nai-b-rith-846-south-union-ave-18.DHUiEWyg.webp","/_astro/b014c43d56b53aba7d00d22175a9c94ea42a3212.DqgvbRpS.jpg","/_astro/b12cd836313730e3e6bf635f37402a03acd62b10.CBKyasB6.jpg","/_astro/b22b9595f01e30e35ee1faa57bff93b2023621ef.CaQPQ3v2.jpg","/_astro/b0a6f386b82b4a6c668df42f752e8d1ddaa5f213.CvgznHm-.jpg","/_astro/b159fe3611aedce08df41ecdd46bab1b5b75b201.CAeL8i1w.jpg","/_astro/b289a4766736589627d3e1411b83d9b417e4eb60.4v8MjxH6.jpg","/_astro/b29a4138776ae8cbe84e19aed12eb803063a92b6.cuPW1KRY.jpg","/_astro/b32c11e63b407bef8b9e354a5c62994d6af76483.faFh5xgl.jpg","/_astro/b305489579c8fd48be8a32d6217ef16eb2e21868.Cxbx-xPX.jpg","/_astro/b34ee4490356ac98b2f337d7c593b9333aa5e12d.DiqoCOS8.jpg","/_astro/b485938fe400c7318f7fb86d30371db383c86c64.B-cssE6j.jpg","/_astro/b52066c6464827a24748c163388de1f2c3dba4a6.Ctf2xc3s.jpg","/_astro/b68f866bd9aa46fb9ede5c6abd80a2b3fae1b17d.BcpeIf8-.jpg","/_astro/b7402fd8bc2cc682fd244895da360817bed219e4.BjfaOrWy.jpg","/_astro/b6acc02190b9570eecb4a53f125f3bd4564c430b.Cjm5pMRQ.jpg","/_astro/b856ccd4d6de0776c6604aa151b271d1da18b652.BYLW4dJe.jpg","/_astro/b85203cca3178c0e8f348f3effb9afccbc149543.D9RFDfAr.jpg","/_astro/b9463193f11962fca2961a8824058aec5b622b23.BNTe2kC0.jpg","/_astro/ba8074ea307dde96d798528dfc3718a62f8c9133.eSDYCNSj.jpg","/_astro/b8396bd1a2b3ec9673a0391e5cccde2f17237ba9.CRah2UTs.png","/_astro/bb1d716ef972d878a57c086ff294f819f2db6c1d.DAl_lP6m.jpg","/_astro/bc132bb6b8bb90c8ff1ae0a4e55f0de08d4e1749.CAGjgArn.jpg","/_astro/bbd2e6a2d5126ea8aa4c20bbb56926c11f79df8b.COYAUwu0.jpg","/_astro/bbbe7f31000110097cebaf7e6d4fe2e7ba9a7cbc.grGpUpPL.png","/_astro/bc3d17c0868012f5204b910ff8b2217e0f8f7cf2.IUF8lGw1.jpg","/_astro/bcab64a422f578e4868a24104ee72943b1eee7b5.BnF-nw-L.jpg","/_astro/bd588fd0775551dda333a205bd4082fd92dc7c52.CD4Wkxxe.jpg","/_astro/be58e053be19466edd2cc65dfcda8504df69bad0.7fhYpAX2.jpg","/_astro/bfd5a91a84ad75c622003348e07a49847f2b4bf2.BPE-JA6A.jpg","/_astro/befa21a51bb7e6da3ca6fd14471c6beff04321ec.CyyRMAd8.jpg","/_astro/c09340a25f6fd26925cfd65a899c7703dc72d8a9.CAM4QSkx.jpg","/_astro/c0e109476b4a80082e5b3875effc225b10df2ca6.Cuv0xGXD.jpg","/_astro/c0963131668f63dc4d9b4f135bcf6717c2e19072.LkIatmWb.jpg","/_astro/c23c2004b4ddcd81ba105d1f3e131ad8e4b14d84.C7UHqOpK.jpg","/_astro/c1af67f69416279b0a710593c60c327cd48b69fa.DDiIufEn.jpg","/_astro/c24373cf265f84e908864bb375793095b20211e6.BlcLqDle.jpg","/_astro/c25c0f5f8ee4aac65ae6086acebb52b490fb54f4.DbuczKD1.jpg","/_astro/c1f884ab5eae80d052f830ec6f465e781097565b.CFuCO5u2.jpg","/_astro/c2987d9083c55b926dd658f8bb8e8aa8361121e3.PSj9rzbE.jpg","/_astro/c2bc707c2c7a8e936fb1d5a84d003da5e1558b8c.Dj5RIbLs.jpg","/_astro/c2c57f6ef7d564785d666fd0740f3c842ca1b2fc.Cad_7rDQ.jpg","/_astro/c36017fdf3ff80939ae8717fd53987834787e494.DaI2xwkz.jpg","/_astro/c31aecbac0b1f6f170abf191300f3e9304a4b7c6.CXF60XPz.jpg","/_astro/c46cabff4b4046472c4905927e5fd65f77833435.CqwFLnm_.jpg","/_astro/c4560b4a972c130c5103f7e94b27bbaf1b43dd1a.BJy6aZZ-.jpg","/_astro/c48f57a7569daca9c6f4258b6ca72d0dabe384f8.37aEJHH7.jpg","/_astro/c5b3e6627738642a533f78a7a934f818512edd52.CfH7VYik.jpg","/_astro/c514a4f748cb7da39d900e542a63155dee37c463.BrhFtBEa.jpg","/_astro/c6596e5fb28380245571e65bfdbcb1dc3ee3876c.6cSw40Yh.jpg","/_astro/c6b41a042fefe51101200da9a0b1cfd8e45071fd.CYWwPVH1.jpg","/_astro/c733a75750a67586054ed1f631f9b960dba57f85.BzzfmB_q.jpg","/_astro/c6772680488f2e73d88a45fb59c5caec93456216.BflBsNOP.jpg","/_astro/c76b1b8391a126c356a3b7bbe92082a00e91f74d.O-WXygMs.jpg","/_astro/c7c6c242e5c8b3756d40281f0ac1ad8bafb2b972.BcTZhllF.jpg","/_astro/c7500817ebc7837150fd10e4bb047a05beea0b5c.CXDK1d6b.jpg","/_astro/c7aa9652861e5e56048c241de3b2878a209a0e5d.YhrgjTej.jpg","/_astro/c7ec1447cbcc2756b16154d7adc0fa42dd63f479.I3u4XgCa.jpg","/_astro/c8091b84dd40b2663fa1802c40f7d582e8e844ef.TLPpukZh.jpg","/_astro/c881454591b551e9676476f27d8ce9a80d8011c6.IysJxa2C.jpg","/_astro/ca28e45b87c65fd0bb894b6d83430d2b23b5061b.BxmDmuFJ.jpg","/_astro/ca2d9cc82d29d10e6386032c1b15d80a146a20a6.BBdffF0T.jpg","/_astro/c96a2766daf64650c2953a1737c00a0264e8f733.HDAY0wYR.jpg","/_astro/cb236aa5743a5aece3cbee84cdd814e24795d6b3.Hys-ilP-.jpg","/_astro/caa28f8ab28c85f1f5836d61f662366859d87510.BG0ycnGv.jpg","/_astro/cb91fc4550ad3a73678d52b897facdcb0cf19f77.DR4k8OTv.jpg","/_astro/cb5b316d4f9caadd532e8ec12163842580f167b5.BWk1U4L4.jpg","/_astro/cb8802d4aeaaed49ba79dd1d1900402165a26f5e.DfdD9J-E.jpg","/_astro/cbed0ca0568c4228c201f85106fb42fdeeac6183.CFvsZTTg.jpg","/_astro/cbaa5cf951f6110834ea71853ae8fe219629a8b2.CUgRiLN-.jpg","/_astro/cbbdb6e7c16a1997d646d84e6ded5c6a279ac610.aTlb2OWH.jpg","/_astro/cc1d701f4ec4bbc32988cfadc258912b949a4703.CvTUtNsz.jpg","/_astro/ccea9700b35b44dbdf0836ac2e9d230d077565e2.CrRBXN13.jpg","/_astro/cc49e6a341c4f9bc69814c830fa43b4398b3eec1.eQpBtEgp.jpg","/_astro/ccfa2474d70814976856c4e60d9a0f061518a8fd.aBaUkFzf.jpg","/_astro/cd251d98b9f37818a9ea9209754cda252dbef130.zWSVyfP6.jpg","/_astro/cef774d3cb2e92528f20f0bb563bf559fe8079f4.CaQAvzHU.jpg","/_astro/ce0efa73214d3badf4d61e50452cf513f389e2e9.C911pp3c.jpg","/_astro/cfdc0c92a00f33ca50ae583eafe69501866feae0.MvTMd4Us.jpg","/_astro/cf494864284b3a8dbc16c949505d4885d1dbcee5.Ctr-AyPl.jpg","/_astro/cff6e77f839563d0a328e0a2621b30ebdcff6a30.DGWkAPvt.jpg","/_astro/d09591755f7718ed2619c976cde7752be1f84a7c.C0Cu24sY.jpg","/_astro/d029c85087bf6707b73b6468f53f737f106f7b10.CbD6iNWh.jpg","/_astro/d06b1d6b270ff11d5db1d41bbe33ad03671d2a9f.BrwMaAlE.jpg","/_astro/d03924cc6b83f562af71408291357f6047f6343b.BHvf5-iz.jpg","/_astro/d0f0450f0a24b0100202177e3082c8b55045d02c.tXXAdo3W.jpg","/_astro/d170050c6d21463413ecd10ee77480b87d4e804d.DU3jG2qV.jpg","/_astro/d182d78e88a7476dfc6c40655bbffd286b5780da.DnEr174V.jpg","/_astro/d1454cb09b552311130a529f27d830c93930cdc1.D6Uy2Z2W.jpg","/_astro/d19d168bd8fbd6676f1873bce41c50ee2ba5f504.DPPHms92.jpg","/_astro/d35e54b5ee13f50ff6587735acf1b2ceb8e25e22.BYM0N61e.jpg","/_astro/d1b609ebb62fa90648c41ab559b39834f4c08328.CjkIt0iX.jpg","/_astro/d35663a7503f2f6f6c01738f3b1c63c98e0a1b69.DLC6Kkod.jpg","/_astro/d44b3c7dad41fd28ad28158821370795b4eff8fc.DKJh-tPW.jpg","/_astro/d48ee1b6029ed25c93969baebaf9b2dccde7e7a8.Cw-W4YiJ.jpg","/_astro/d3cac3c2ae2238037bc2e3864e0567b3f7264dcf.DfP4hB2L.jpg","/_astro/d573741d68b378aa85e0a01c1ac67e8a5fb43e7b.Dv7sDUJT.jpg","/_astro/d51d3535bec306926af9d2c518a7220da7000891.DN9prpm1.jpg","/_astro/d5a7f86c846f937ed7d3e0a6bccc59c79a168f92.CxeN_Zbw.jpg","/_astro/d5be2a63ebd629a68947a2b558a7e980286122af.DkutsHwq.jpg","/_astro/d63659bae632b805c60afbc3e24b675d0cbff6ba.CC-tZkcA.jpg","/_astro/d5eb200f01dfd66d2eceb72fbf957909f5d92d1d.fUBO22k4.jpg","/_astro/d78b1ead586da5fe968189a7e68f38ce8c075893.CBw3bwPr.jpg","/_astro/d8b918c041d762c7c348c79d66550399eefe7396.DRvMZHE5.jpg","/_astro/d92656498e2b07d1aa8aef32a22a42dbd19c8041.B5rrO2ld.jpg","/_astro/d917ea376c8b435d476a7a07428af3d183cc65ec.D9ohJXxQ.jpg","/_astro/d967a7a4aad3e07a0109a399e87bc53ddd5bf020.KGMGAu4t.jpg","/_astro/d993c147c49751e810d5a2b86da7a8d3768f01d7.BE2Po61o.jpg","/_astro/da1ee83ed23e10c3b77c7f25d6ec715c8ab6b961.DffMp73E.jpg","/_astro/da7d23ed5b274e02a4f1969d7d3dba12718a0a07.nxwi8dCH.jpg","/_astro/dabe21e3caea9074be8cef15149f6f470d78e9c4.DauDsBZE.jpg","/_astro/db05042c90f6e9c9ee231852cd95dac244634179.D4D0pXZ8.jpg","/_astro/dac3349b50709584b7601284e4a9e93b6a473593.FF2YCncC.jpg","/_astro/0568dae5b9a492d8b1b4bcb2844599e2b0f7351a.CVHG3BpH.png","/_astro/12344d7e554717f5c55b46c75a0b3c8643ce997c.CVFGeePa.png","/_astro/12ac7efc85d640f1ba8ae7d84f51930bec5712a4.DfLyNufP.png","/_astro/348906415217d4255b995bcb9e54d9c96c0d895c.1tR5NxCA.png","/_astro/233c0bbff6b5c8fc1dec1de183e4fe35ce28fe67.ByT95guj.png","/_astro/34cf7d19901fef6c301446c47745de8ed4fa840f.BKblKPz6.png","/_astro/360a138b374d1f6a1a5a4a66bfc08b5d3ec90c33.VkFCNEQH.png","/_astro/4111d2542dd7f9b37814e07d26608d59a2930d48.Cru4rNUe.png","/_astro/43fd03ddaaa62cc880aa64c6723b660d9c3ec161.B5rhub1m.png","/_astro/4c928abb0730e0592f10e5ed85d8942a459b6e58.C65jg_32.png","/_astro/5d3131879fdf30074cc3f3fa9854564be7c71902.1Fj7sMGY.png","/_astro/726bf70ecb72f20168d7f0362462a6e55055664f.CW0SA8Sc.png","/_astro/76b4e844a13c7dbd56de1eee6c730a6eaf5898f3.CVs94PsM.png","/_astro/877ea901189af83dccf239316c36ce7b560822a9.CLK6L_wu.png","/_astro/904be677dc32abff73a8395bbc85f6bc47248dda.B99ACWs4.png","/_astro/8f409b36f5590fff2502b29f109eaf4c9b2f3692.DIZHT7RC.png","/_astro/94ce7bb4e9056753d37f98a04fa92ebcc0b854ab.Bz6EPYAo.png","/_astro/9194c0438cdc48fa63e6cf3ee5580fff9eab5f49.DbL2Gexr.png","/_astro/9421db5a35fec681f8837cd54948b5a00b542a60.3-155MWF.png","/_astro/a720e08d827fcb325f8cc4e673cef4fdfc4d79cd.iyKoYAlC.jpg","/_astro/b57a0d3af3fcc86599f47179ce1e8a1b54d06f1f.C4HGin-5.png","/_astro/9d067bd4ca905332492311958bd6c1b24b225686.fqRbltA6.png","/_astro/b4f4a674854a5ccc71bc0e930f1dff5cbbecb116.CqMTYqkM.png","/_astro/bc627d8f8a78a84723c10db0bcf51c5acdd492ee.BRA_LOnP.png","/_astro/d2b68972e1d18d7e85f8feac0f6af53796665426.D9gga_HU.png","/_astro/d436dc97d59d714427237ee886c4bdadaaf85d65.BmM02FcW.png","/_astro/c50daa1e522e926b9ca13e8a2d1ac3ae37b845d9.Cx7GT1yv.png","/_astro/dbb2e5a2245fa7c7b91322bdc22f244c0800648c.BI6yT_B6.jpg","/_astro/dbf8a8745d94ac16e10a8924f6f0e4190d0c07ba.DZCGHKxO.jpg","/_astro/dc0f86206eb5b745de5e61034b5e75fc6b6e2250.C9bLsdKg.jpg","/_astro/dc22972b6b7943414fca5e81e2aa5def3348ca0c.C9O7C6TJ.jpg","/_astro/dc6d948d97a5d1a5bc81fa362fe9055321b75764.CAHHPiHd.jpg","/_astro/dc8a57ae9a56c24a024fbb23b53a5671618107ea.CiNuh0L8.jpg","/_astro/1177d9df46de6c9f8a1d349177d8da715f4cb143.CgkrTKAM.png","/_astro/2df4692c8f2cf7504af283a524f3737c751ca112.Bvnnn7A1.png","/_astro/5ce19dbb84650bbddb6fdcbea7eeaebfab94877f.C2_JTV-j.png","/_astro/64b2cee1ca4c8044325dc36d167f53fc0d4459f0.DYJs-IIp.png","/_astro/5d9ea80188d6769eec3ee961aba76ab4dc61331e.DzYUGLBN.png","/_astro/84e00a9ea4ca0a6504d4ccead530eeb20a031760.6sS2hdAR.png","/_astro/b88e37eec2e3ad965fd11dd15db66e710176b233.Bpgrewuw.png","/_astro/c569d6176667712a8f8713715a9cb816acca4b09.DywBhnbr.png","/_astro/b0422909e1d6a0ab3479070b7be5ecb72b826b5d.DDmf0HWV.png","/_astro/de31826451b032d854dc39b8718d71b8a60f4f69.DZ8Hsa_N.jpg","/_astro/de4bf2c77a2e2487c7ed2f48e79c1c8c91b698ca.CGgJ0Kw9.jpg","/_astro/df86a066b73ff33e48f2a663ceb226c6a8598574.NhBxzyet.jpg","/_astro/e0c9346749b2d26e6cbed3387c08680729971d69.RswLHjN1.jpg","/_astro/e0ca2c44c2c22f3f9a03f59a027ddff2fffc2bcf.Bj5-upFx.jpg","/_astro/e109f8a1923f0b34645caa9772021de4dc9f8c4f.D8IYhsC1.jpg","/_astro/e10726ae7c3c85f9b0e574609a3ae068e4b0b7a9.Co4nGUv_.jpg","/_astro/e17a41b2925cc5a9d26a35116a208b53c53b55f1.C5N8C4mn.jpg","/_astro/e18a21a96a7e4af64d495a8d3e5f734933063aa6.DjSdKZA7.jpg","/_astro/e1f56d11cf689827f25d70f1685f711c523facd6.CTTNwvft.jpg","/_astro/e1e611863a57f74ace574756826ad30c0bee83d1.Bvx5XJ9e.jpg","/_astro/e228b644fdcd45d6635b8405de33d03726a9de7e.DMPDvYEA.jpg","/_astro/e291bbcbbab45ae036172d1c205cddf1091e4bc4.CrPIhWxP.jpg","/_astro/e2a68b83472b3e7fbd95b7892a1c0854c5aafee6.wiZ32baZ.jpg","/_astro/e3125d4774daebb7a824922d9a214e976741a901.DhctmMtG.jpg","/_astro/e2cf22a86d996f4232954cebe740bd4530634f8e.CZIVCVV7.jpg","/_astro/e371e2851167346c40aa6f88be62a7a824e8da72.Da6ZznoS.jpg","/_astro/e39bdf39234e180fc80e145920594137aeeee53a.DmrUM1rD.jpg","/_astro/e45921360898593cd5f73509dde7e0131302da53.BGUA1wkQ.jpg","/_astro/e4a1a641f51392537429c304be88b9ccf9887cdd.C-moQjVU.jpg","/_astro/e47e7c40045decc89e0ac1d9f290ae49ed8c685c.DVCknNIR.jpg","/_astro/e4a1c9a0d59096004614bed943bfb93a2de9600f.CrNw7Bb8.jpg","/_astro/e611fc9637d25ebc4c91acd392671c574d8d2ed8.Bsw82LqH.jpg","/_astro/e5a6dd19ae502fb8386ba62703665982fb20c466.39tGbNKy.jpg","/_astro/e6eb7f5d4a48e4dda15c52f48059bc91d4e8c259.o8F8ksdC.jpg","/_astro/e75d411bd8a8dbd16f648f3a3e7015c0b5a0f1b3.CFPM-OYG.jpg","/_astro/e75e2bfabcf8b0c1c53dbf7e6c39a9bc631e8087.BOG7zvx1.jpg","/_astro/e7a272215d303e2ded6436f0cd805a1a2f8e79f2.KlFsFv-A.jpg","/_astro/e78494c6a4b753ff49cfacf80eb78883e76fe1e0.J9U5ihCB.jpg","/_astro/e7a8b6a517ec0ecf13b1f86e74e4523442c3c826.ghDlStfY.jpg","/_astro/e78ba563dc5fbe4a9bc9b8682968407b4e3fea42.BJ79dJId.jpg","/_astro/e7d659feae08e4c913888138779afd1a8d43d8b8.CU2ZOiNx.jpg","/_astro/e7c84348e9087f43a300ece3f0663592acaf83cf.BLubVH7C.jpg","/_astro/e7d761e9c5bce7018872ae4ac22a0ffc50fb366e.CuEiVtdv.jpg","/_astro/e7fb2269bfac1174c17e69d6be099666ad49eb88.B-4oNo8e.jpg","/_astro/e80a26c521dbea9a00faba77d37e713c655709cb.De_IBqYy.jpg","/_astro/e8280bb3810110b98b559e0a5a7d3acd988f5ee4.W6iIA_fA.jpg","/_astro/e83ac5160e6e61c077f7fbdbc5e24d9365129842.CWxmcE4P.jpg","/_astro/e8408b30199e775b843c5546847b88e9036410b1.CTO3rITN.jpg","/_astro/e84ad1381b7702fbc8bb7f509345b9e05cf97368.DV8uO7jl.jpg","/_astro/e85e67ac5c9d55d1efbd0ed6969339cfb462bcde.IJOMkQIw.jpg","/_astro/e897af2e044623db9f7a1e97d33c8c3d7a66c3f2.CJV_1Hh8.jpg","/_astro/e908ebff8b169f13c6638920f95d64c074ac494e.Bg9EUpOm.jpg","/_astro/e96fd067f9a5106e8418416b14b664481a649717.B_ANvXQ6.jpg","/_astro/e9f4cc197d26efe47375ff43125729771ae403ab.Cf8v3q67.jpg","/_astro/ea3c1555a83f67839ef4bc1bc124f9eaff42a2fa.de4h0vBs.jpg","/_astro/easing-back-into-it-via-915-s-grand-view-01.DeK7OlzU.webp","/_astro/easing-back-into-it-via-915-s-grand-view-03.Bl3fmYWG.webp","/_astro/easing-back-into-it-via-915-s-grand-view-02.C8XiHbTd.webp","/_astro/eb1f06977ed54ce402a673184c8444a1ea3f0668.Du_h01f8.jpg","/_astro/eb4c93bbab869f70ffa7caef7161c4f590b6985a.cHG0hZC-.jpg","/_astro/eb8b21f871168c35c597a9b4a814d89399e6a9ed.Cqgq2y7I.jpg","/_astro/ebe0883dd0327385dd36c1a8a7ba7d115a266f44.CvJKWO48.jpg","/_astro/ec0c1ea0b432f66a014464c68308222557a36150.C74PT17h.jpg","/_astro/eb70265f95dad5ebc5aafdf9ee116518c30193f4.BNdQQK_a.jpg","/_astro/ec3fc9ce1a386fb71326ca77c97ed3a290eb0677.COAIoLp_.jpg","/_astro/ed506f86d5eaa43d07d55276e47c37bc727792b5.BRBRhFgR.jpg","/_astro/eeae1ef11de1cbcd66fd5a526d43e976dc558961.SDfPFX56.jpg","/_astro/ecd489e63560ae00ebf68be2a90756189bcec0ad.BWg9PYjv.jpg","/_astro/ef6aab5d51016866686e6e403994f0c64426c8d2.BBkgSR25.jpg","/_astro/ef99e9d6cd0866a0a6b8ed26a000e7bf0db6e21f.doKH3ltV.jpg","/_astro/efa2daffe754b31b3376af7f6ba128367450ad1d.CNyaFSCy.jpg","/_astro/f13e005bfe8fcc37d12e133d743ad8b9f3298dd4.BB7wp0yZ.jpg","/_astro/f1cd484e45944229e33888865ac9a90fd4c18c06.C5g7YV0F.jpg","/_astro/f15f90fe842f1a28b46cc6e8f2429e619863d065.C84xYK7v.png","/_astro/f1d89320b8c523457b81c874731b4d11299d6a48.CMyEaKkO.jpg","/_astro/f2b8916a102f479a41ed824d5846e74ba8e27d9f.ClbVF_5h.jpg","/_astro/f351609df81fa7a0701c17205b39152c283ac70a.Cf9-Zrxf.png","/_astro/f2dc1e71a18f6a3763856173d3f9fbaa657da65a.BXyzjNqN.jpg","/_astro/f38883fcfdc0315c106ece47592c3cc28343bd69.DY9BXDqB.jpg","/_astro/f3c9a5fc732d4b76a9c2a2657a3917f583d23519.BMPC3q7k.jpg","/_astro/f1f5b9e5012fe2d7d5b426f707f49e35e2be325d.SXZzyTeJ.jpg","/_astro/ef862e408adf547ea1b00af405f5740fceb8e1f5.C4zpLSM_.jpg","/_astro/f47955c85f94ff265c560ee211d06c5354bc92fc.CiTbOUYC.jpg","/_astro/f623e6bc90f9ee3fc59a9996452749323ef5e01a.BW3p8R8g.jpg","/_astro/f53b589eb605fc94bbb398fef6afb05f6b804167.MEQqYT3z.jpg","/_astro/f60164c97d55e7f2d3ba891424b61891b05cb433.Cj7qTrey.jpg","/_astro/f8310483e7e0525fb66024d7dac6fd4498131bd2.C520yVew.jpg","/_astro/f9a8f8c0f054b457d92619f3c05d1c751cea0cea.CQjkZxzY.jpg","/_astro/f9cc42f9c624a777eac2e0afff6f1254f22c186c.DgA0v1pV.jpg","/_astro/f8823f7203f3242c0cd572a54748ff1931f00155.Clyo6aYo.jpg","/_astro/fb610e7a1507a5fb73b6d9163054930781b33fa4.9PC29Pqk.jpg","/_astro/fb15b8b642cf7fece343cab069684986bde1daac.BcwmDmWx.jpg","/_astro/fb9abb67754ce5bc74057c9f84a1c30d2aef3e56.BhBM-QeJ.jpg","/_astro/fc01b39ada4a81990d061e142e56d30bde1f6370.mwANrCYa.jpg","/_astro/fbbbfa84adbe6872d252f95b744060ad3960c273.DynGw9Lh.jpg","/_astro/fd4d68bb82a6fd3f3184eb2fff1290835109a4ee.ChMhXmYt.jpg","/_astro/fe57128ded5b2a25fee8ad3cf533d38bd53d4642.BjLOR7lc.jpg","/_astro/fd178daf94d65b76fcc3665afefbe01b735c2f95.DQY6lx3l.jpg","/_astro/feef000d17dea0a91fac862e045643d212510e59.DkpX0ylp.jpg","/_astro/fec9b211566ed244604d303c8e8fb912d109feb1.CMTavE6A.jpg","/_astro/fe67bc4ff5c711a58afb67fc06144568a41f5cc9.G7fHbB4y.jpg","/_astro/fire-on-east-fourth-01.yLNSDEIm.webp","/_astro/ff7d8392e8e4707a78a5e4196f7048b2cb724124.CVDkUJou.jpg","/_astro/fire-on-east-fourth-02.CMfipPpN.webp","/_astro/fire-on-east-fourth-04.C5HE1xG6.webp","/_astro/fire-on-east-fourth-05.hj0ikWd5.webp","/_astro/fire-on-east-fourth-06.DjwFfTSX.webp","/_astro/fire-on-east-fourth-03.DaXoOOJO.webp","/_astro/fire-on-east-fourth-09.6QK9Ih9_.webp","/_astro/fire-on-east-fourth-07.DWnByJk2.webp","/_astro/fire-on-east-fourth-08.Czv_PhN3.webp","/_astro/greetings-01.6z-IhxZk.webp","/_astro/fire-on-east-fourth-10.C-L6vKmP.webp","/_astro/isr-test-02.Billl2LC.webp","/_astro/isr-test-03.DMEWLGiY.webp","/_astro/greetings-02.BYa2GfUm.webp","/_astro/isr-test-01.BieEXFlq.webp","/_astro/la-cienega-motel-1725-so-la-cienega-02._UOSUkDq.webp","/_astro/la-cienega-motel-1725-so-la-cienega-03.B4tvmx7s.webp","/_astro/la-cienega-motel-1725-so-la-cienega-01.P8zLlngA.webp","/_astro/la-cienega-motel-1725-so-la-cienega-04.C4BEmzCJ.webp","/_astro/la-cienega-motel-1725-so-la-cienega-05.BqlhlIO2.webp","/_astro/la-cienega-motel-1725-so-la-cienega-08.BMuV6EdN.webp","/_astro/la-cienega-motel-1725-so-la-cienega-06.C8BQG4vA.webp","/_astro/la-cienega-motel-1725-so-la-cienega-07._PdwqaKt.webp","/_astro/la-cienega-motel-1725-so-la-cienega-12.KVgP94_Y.webp","/_astro/la-cienega-motel-1725-so-la-cienega-09.CPXYw7UQ.webp","/_astro/la-cienega-motel-1725-so-la-cienega-13.DekLWifM.webp","/_astro/la-cienega-motel-1725-so-la-cienega-11.VO4dlR-M.webp","/_astro/la-cienega-motel-1725-so-la-cienega-15.CmDnZRjH.webp","/_astro/la-cienega-motel-1725-so-la-cienega-17.D8F_6Zc3.webp","/_astro/let-s-talk-about-taix-01.C2Q-1roh.webp","/_astro/la-cienega-motel-1725-so-la-cienega-10.BugeuU7F.webp","/_astro/let-s-talk-about-taix-03.wx6t06Jy.webp","/_astro/let-s-talk-about-taix-04.BrVTRf_8.webp","/_astro/let-s-talk-about-taix-02.DlzC-V6V.webp","/_astro/let-s-talk-about-taix-05.D5JS5TjL.webp","/_astro/la-cienega-motel-1725-so-la-cienega-16.kDesxM_0.webp","/_astro/let-s-talk-about-taix-06.BDsbuSLq.webp","/_astro/let-s-talk-about-taix-07.BpkJzhpR.webp","/_astro/let-s-talk-about-taix-08.CZMXKsvc.webp","/_astro/let-s-talk-about-taix-09.Cl69Y921.webp","/_astro/let-s-talk-about-taix-10.M9hKj3Em.webp","/_astro/let-s-talk-about-taix-13.DI-JbS8M.webp","/_astro/let-s-talk-about-taix-11.BIzAPyCz.webp","/_astro/let-s-talk-about-taix-12.DZrElwkh.webp","/_astro/let-s-talk-about-taix-17.ByqXwzgi.webp","/_astro/let-s-talk-about-taix-14.CdpxS0lE.webp","/_astro/let-s-talk-about-taix-16.DgcIerz7.webp","/_astro/magnolia-update-01.DWxADO2o.webp","/_astro/let-s-talk-about-taix-15.BUHSosj5.webp","/_astro/magnolia-update-02.K5p9gj83.webp","/_astro/magnolia-update-03.BnuqHiIO.webp","/_astro/magnolia-update-04.S6jzckid.webp","/_astro/magnolia-update-05.DU2aoIqn.webp","/_astro/marilyn-s-house-02.zHXCGy-k.webp","/_astro/marilyn-s-house-01.MDZNlbVY.webp","/_astro/la-cienega-motel-1725-so-la-cienega-14.NqZdCQ0-.webp","/_astro/marilyn-s-house-03.o9ADUCFC.webp","/_astro/marilyn-s-house-05.CDY0HTEN.webp","/_astro/marilyn-s-house-07.68x1qzpL.webp","/_astro/marilyn-s-house-04.BxBQYHNK.webp","/_astro/marilyn-s-house-06.zGVBnQZu.webp","/_astro/marilyn-s-house-09.CBP6C5kR.webp","/_astro/marilyn-s-house-10.CD3EoUJQ.webp","/_astro/marilyn-s-house-13.4RRg9JKU.webp","/_astro/marilyn-s-house-12.Cwwc9qfW.webp","/_astro/marilyn-s-house-11.bl0JIuBx.webp","/_astro/marilyn-s-house-14.CuNXDTKc.webp","/_astro/meet-553-north-heliotrope-04.Uh2MHoOB.webp","/_astro/meet-553-north-heliotrope-02.D4Sv5UZ6.webp","/_astro/meet-553-north-heliotrope-01.CuqbJvQ3.webp","/_astro/meet-553-north-heliotrope-05.BWHVJZF5.webp","/_astro/on-another-note-01.DEviPvir.webp","/_astro/meet-553-north-heliotrope-03.3FPrE9eZ.webp","/_astro/old-glendale-03.CkJB8XIA.webp","/_astro/old-glendale-01.Dx6rP-CP.webp","/_astro/old-glendale-02.CyQjRXp_.webp","/_astro/orion-housing-even-worse-03.1M6gIbQ1.webp","/_astro/on-another-note-02.CKjX6ye-.webp","/_astro/on-another-note-03.9DttL7ZU.webp","/_astro/orion-housing-even-worse-01.BWW87HUI.webp","/_astro/orion-housing-even-worse-05.QFWRLYY5.webp","/_astro/marilyn-s-house-08.Bqss9Hj6.webp","/_astro/orion-housing-even-worse-04.b3XxX25v.webp","/_astro/orion-housing-even-worse-06.C-_xyTUE.webp","/_astro/orion-housing-even-worse-02.CsqMIv5N.webp","/_astro/orion-housing-even-worse-09.DzLtUhMt.webp","/_astro/orion-housing-even-worse-07.CzNF_cij.webp","/_astro/orion-housing-even-worse-08.Dsg4c9gl.webp","/_astro/orion-housing-even-worse-11.Dl7TvFYj.webp","/_astro/orion-housing-even-worse-10.CAAzIogk.webp","/_astro/orion-housing-even-worse-14.7W17LT6H.webp","/_astro/orion-housing-even-worse-13.54E-lcgY.webp","/_astro/orion-housing-even-worse-12.XqrXo1gD.webp","/_astro/orion-housing-even-worse-16.CkI6k1cl.webp","/_astro/orion-housing-even-worse-15.BpB9C47Z.webp","/_astro/orion-housing-even-worse-18.CUyp3JWA.webp","/_astro/orion-housing-even-worse-19.Bfosr0Zy.webp","/_astro/orion-housing-even-worse-20.Bm0NHlpE.webp","/_astro/orion-housing-even-worse-23.B4jdk7C4.webp","/_astro/orion-housing-even-worse-22.BEQNKVS-.webp","/_astro/orion-housing-even-worse-17.BbQSaI5w.webp","/_astro/orion-housing-even-worse-24.CAwd1eXm.webp","/_astro/orion-housing-even-worse-21.odgkdL0H.webp","/_astro/pacific-bowling-center-dancing-waters-club-1331-s-pacific-ave-03.CC66lNjh.webp","/_astro/pacific-bowling-center-dancing-waters-club-1331-s-pacific-ave-01.C4RyBOr6.webp","/_astro/pacific-bowling-center-dancing-waters-club-1331-s-pacific-ave-02.yxwHq1uq.webp","/_astro/pacific-bowling-center-dancing-waters-club-1331-s-pacific-ave-05.7cbRkjAZ.webp","/_astro/pacific-bowling-center-dancing-waters-club-1331-s-pacific-ave-04.CZV05TVK.webp","/_astro/pacific-bowling-center-dancing-waters-club-1331-s-pacific-ave-06.Bvu6kVdE.webp","/_astro/pacific-bowling-center-dancing-waters-club-1331-s-pacific-ave-07.D_iXhUDB.webp","/_astro/pacific-bowling-center-dancing-waters-club-1331-s-pacific-ave-08.DyyFlqqh.webp","/_astro/pacific-bowling-center-dancing-waters-club-1331-s-pacific-ave-09.sK3ESF9_.webp","/_astro/pacific-bowling-center-dancing-waters-club-1331-s-pacific-ave-10.Cq5jvfGw.webp","/_astro/pacific-bowling-center-dancing-waters-club-1331-s-pacific-ave-11.CcC_Gkg3.webp","/_astro/pacific-bowling-center-dancing-waters-club-1331-s-pacific-ave-12.DwXk2AnY.webp","/_astro/pacific-bowling-center-dancing-waters-club-1331-s-pacific-ave-14.D7u4D8Kd.webp","/_astro/pacific-bowling-center-dancing-waters-club-1331-s-pacific-ave-13.Bh9o-qHG.webp","/_astro/pacific-bowling-center-dancing-waters-club-1331-s-pacific-ave-16.D5k2gC_2.webp","/_astro/pacific-bowling-center-dancing-waters-club-1331-s-pacific-ave-15.L5hXoi95.webp","/_astro/pacific-bowling-center-dancing-waters-club-1331-s-pacific-ave-17.xQIWhHwL.webp","/_astro/remembering-santa-monica-01.9mLwsGRH.webp","/_astro/remembering-santa-monica-02.DtKdg_OU.webp","/_astro/remembering-santa-monica-03.VI2ZIZKl.webp","/_astro/remembering-santa-monica-04.CRFuGgse.webp","/_astro/remembering-santa-monica-06.B-VE9uK9.webp","/_astro/remembering-santa-monica-05.BCFJrG9o.webp","/_astro/say-goodbye-to-old-westwood-01.BFvahgHW.webp","/_astro/say-goodbye-to-old-westwood-03.DOiiSm3w.webp","/_astro/say-goodbye-to-old-westwood-02.DEmBnE2k.webp","/_astro/say-goodbye-to-old-westwood-06.Cri6yWPw.webp","/_astro/say-goodbye-to-old-westwood-04.DZh2Phdn.webp","/_astro/say-goodbye-to-old-westwood-05.B4VdD0jC.webp","/_astro/say-goodbye-to-old-westwood-07.Ca3-XVu7.webp","/_astro/taix-and-the-city-03.C7PLItYE.webp","/_astro/taix-and-the-city-01.CjbsgYCb.webp","/_astro/taix-and-the-city-02.NJGxXK75.webp","/_astro/taix-and-the-city-04.70le5epF.webp","/_astro/the-bungalows-of-hyde-park-must-be-sacrificed-01.szFVerHA.webp","/_astro/say-goodbye-to-old-westwood-08.DWiElx5F.webp","/_astro/the-bungalows-of-hyde-park-must-be-sacrificed-02.BD3fEiJo.webp","/_astro/the-bungalows-of-hyde-park-must-be-sacrificed-03.BLxBeDHP.webp","/_astro/the-bungalows-of-hyde-park-must-be-sacrificed-04.CKt2Eyk0.webp","/_astro/the-bungalows-of-hyde-park-must-be-sacrificed-05.C1hjhr_X.webp","/_astro/the-bungalows-of-hyde-park-must-be-sacrificed-07.C0iLYrpM.webp","/_astro/the-bungalows-of-hyde-park-must-be-sacrificed-06.Biv98V14.webp","/_astro/the-cecil-is-the-city-s-fault-01.BhbBblDA.webp","/_astro/the-cecil-is-the-city-s-fault-02.CTGGYlsA.webp","/_astro/the-cecil-is-the-city-s-fault-03.V_MvaaFM.webp","/_astro/the-cecil-is-the-city-s-fault-04.XhCtCgKr.webp","/_astro/the-cecil-is-the-city-s-fault-05.C5flRUzz.webp","/_astro/the-cecil-is-the-city-s-fault-07.u-1PlPJb.webp","/_astro/the-cecil-is-the-city-s-fault-06.Bnx5GWNY.webp","/_astro/the-cecil-is-the-city-s-fault-08.QHNkJOKc.webp","/_astro/the-cranky-preservationist-3-beauties-bite-the-dust-episode-20-01.DzI-gM3r.webp","/_astro/the-cecil-s-ghost-01.CApIX-xM.webp","/_astro/the-cranky-preservationist-and-friends-in-save-700-normandie-avenue-koreatown-s-little-new-york-01.DOvMXKXj.webp","/_astro/the-cranky-preservationist-in-don-t-f-with-my-bunker-hill-retaining-wall-episode-25-01.CSN3r-Hk.webp","/_astro/the-cranky-preservationist-and-the-mystery-of-the-shrinking-hpoz-at-1330-w-pico-aka-the-albany-01.Cr6vwm3N.webp","/_astro/the-cranky-preservationist-in-what-the-hell-happened-to-the-pantages-neon-episode-22-01.xy6uqF5F.webp","/_astro/the-cranky-preservationist-in-reports-of-the-death-of-the-white-log-coffee-shop-have-been-01.Dtm5iwkN.webp","/_astro/the-cranky-preservationist-meets-the-l-a-preservation-imp-episode-21-01.C0D4vE2a.webp","/_astro/the-face-of-the-ellis-act-01.CX_JQG4i.webp","/_astro/the-face-of-the-ellis-act-03.DkgDKTFy.webp","/_astro/the-face-of-the-ellis-act-05.BnT-Mrsr.webp","/_astro/the-face-of-the-ellis-act-02.Y-qWvdGB.webp","/_astro/the-face-of-the-ellis-act-04.PBbJ27SS.webp","/_astro/the-face-of-the-ellis-act-06.YAhtJEzz.webp","/_astro/the-face-of-the-ellis-act-08.DnW2hlt5.webp","/_astro/the-face-of-the-ellis-act-09.BbWIaVOn.webp","/_astro/the-face-of-the-ellis-act-07.DUwRqaQv.webp","/_astro/the-fairfax-has-fallen-01.B65xGidJ.webp","/_astro/the-face-of-the-ellis-act-10.Bfy09Tz-.webp","/_astro/the-fairfax-has-fallen-02.C0Q1Yz4U.webp","/_astro/the-fairfax-has-fallen-04.BkxiU3-u.webp","/_astro/the-fairfax-has-fallen-03.iEuwOsut.webp","/_astro/the-fairfax-has-fallen-06.joG5kTWf.webp","/_astro/the-fairfax-has-fallen-07.D_Wm2pj5.webp","/_astro/the-fairfax-has-fallen-09.oRdGlriu.webp","/_astro/the-fairfax-has-fallen-08.BCVLtKbt.webp","/_astro/the-fairfax-has-fallen-05.B49ylv29.webp","/_astro/the-fairfax-has-fallen-10.Da3ESvec.webp","/_astro/the-fairfax-must-fall-04.C9N8saGF.webp","/_astro/the-fairfax-has-fallen-11.BHhDonwB.webp","/_astro/the-fairfax-must-fall-03.CrAXhryc.webp","/_astro/the-fairfax-must-fall-01.DQt5CkiJ.webp","/_astro/the-fairfax-must-fall-05.DMUxQMmV.webp","/_astro/the-fairfax-must-fall-02.D-Mkwz2Q.webp","/_astro/the-fairfax-must-fall-06.9w7swswr.webp","/_astro/the-first-new-post-in-a-very-long-time-01.RtXqBsnX.webp","/_astro/the-fairfax-must-fall-08.Ceqalbpd.webp","/_astro/the-fairfax-must-fall-07.C9NK28X_.webp","/_astro/the-house-at-1408-w-35th-st-and-then-some-03.CM9h8hgD.webp","/_astro/the-house-at-1408-w-35th-st-and-then-some-02.DE0BIy95.webp","/_astro/the-first-new-post-in-a-very-long-time-02.C-heYHGP.webp","/_astro/the-house-at-1408-w-35th-st-and-then-some-01.DWbM4KIY.webp","/_astro/the-house-at-1408-w-35th-st-and-then-some-04.BRT6DGqF.webp","/_astro/the-house-at-1408-w-35th-st-and-then-some-07.lDaN5yrG.webp","/_astro/the-house-at-1408-w-35th-st-and-then-some-05.D-A6Np9X.webp","/_astro/the-house-at-1408-w-35th-st-and-then-some-09.pRyDxU7n.webp","/_astro/the-house-at-1408-w-35th-st-and-then-some-06.CjooWAu-.webp","/_astro/the-house-at-1408-w-35th-st-and-then-some-08.1H3Or1Qh.webp","/_astro/the-house-at-1408-w-35th-st-and-then-some-10.DiSgHacr.webp","/_astro/the-house-at-1408-w-35th-st-and-then-some-12.DMHoRCBC.webp","/_astro/the-house-at-1408-w-35th-st-and-then-some-11.DC57bXqX.webp","/_astro/the-house-at-1408-w-35th-st-and-then-some-14.CgIkDuNs.webp","/_astro/the-house-at-1408-w-35th-st-and-then-some-13.BVsEbnwE.webp","/_astro/the-house-at-1408-w-35th-st-and-then-some-17.DkIVCVsf.webp","/_astro/the-house-at-1408-w-35th-st-and-then-some-18.B4Rg6SVd.webp","/_astro/the-house-at-1408-w-35th-st-and-then-some-15.BxfnWJyE.webp","/_astro/the-house-at-1408-w-35th-st-and-then-some-16.-gwH0iJX.webp","/_astro/the-house-at-1408-w-35th-st-and-then-some-20.H3T43uD4.webp","/_astro/the-house-at-1408-w-35th-st-and-then-some-19.B0h4EVOl.webp","/_astro/the-house-at-1408-w-35th-st-and-then-some-21.BmljXx8E.webp","/_astro/the-house-of-spirits-01.DntqpSjP.webp","/_astro/the-house-at-1408-w-35th-st-and-then-some-22.Bd54VIvN.webp","/_astro/the-house-of-spirits-02.DuPs_HUE.webp","/_astro/the-house-of-spirits-03.BZI0gMCn.webp","/_astro/the-house-of-spirits-04.CJtLaxpC.webp","/_astro/the-house-of-spirits-05.D-3f5XZK.webp","/_astro/the-jardinette-apartments-will-they-return-from-the-dead-01.BygNmS6o.webp","/_astro/the-jardinette-apartments-will-they-return-from-the-dead-03.DTIuyahR.webp","/_astro/the-jardinette-apartments-will-they-return-from-the-dead-04.DrqNIBzH.webp","/_astro/the-jardinette-apartments-will-they-return-from-the-dead-05.-4c1iCTz.webp","/_astro/the-jardinette-apartments-will-they-return-from-the-dead-02.weY--alb.webp","/_astro/the-jardinette-apartments-will-they-return-from-the-dead-07.BKIq3iRo.webp","/_astro/the-jardinette-apartments-will-they-return-from-the-dead-08.FNsFHKDg.webp","/_astro/the-jardinette-apartments-will-they-return-from-the-dead-10.BKZhdRlx.webp","/_astro/the-jardinette-apartments-will-they-return-from-the-dead-06.Ctzcswqh.webp","/_astro/the-lost-art-deco-of-baldwin-hills-01.Buf00a1F.webp","/_astro/the-jardinette-apartments-will-they-return-from-the-dead-09.CemF-mw-.webp","/_astro/the-lost-art-deco-of-baldwin-hills-02.Dx1rAfy-.webp","/_astro/the-jardinette-apartments-will-they-return-from-the-dead-11.D1vpNKNN.webp","/_astro/the-lost-art-deco-of-baldwin-hills-03.B3CYZiHC.webp","/_astro/the-lost-art-deco-of-baldwin-hills-04.BhfUtc5U.webp","/_astro/the-lost-art-deco-of-baldwin-hills-05.WhwAuikq.webp","/_astro/third-strike-wiseman-01.B9a8_vPY.webp","/_astro/third-strike-wiseman-02.BAwwXrWi.webp","/_astro/third-strike-wiseman-04.zSvRuqAx.webp","/_astro/third-strike-wiseman-03.DXvRmeof.webp","/_astro/third-strike-wiseman-06.CjgOtWxC.webp","/_astro/third-strike-wiseman-05.CBIm8u05.webp","/_astro/third-strike-wiseman-10.BHaAVDcx.webp","/_astro/third-strike-wiseman-07.DpCFZysk.webp","/_astro/third-strike-wiseman-08.D8bxQ2Bp.webp","/_astro/third-strike-wiseman-09.BZXHIO-e.webp","/_astro/third-strike-wiseman-12.BJ291hlP.webp","/_astro/third-strike-wiseman-11.DnxCJFiY.webp","/_astro/third-strike-wiseman-13.m31N9Zbl.webp","/_astro/third-strike-wiseman-14.qnlGUNjF.webp","/_astro/thirty-posts-in-thirty-days-02.CVMyOPM1.webp","/_astro/third-strike-wiseman-16.DMuWTNNS.webp","/_astro/thirty-posts-in-thirty-days-01.1AyDgtBD.webp","/_astro/third-strike-wiseman-15.Cybj4Q-n.webp","/_astro/thirty-posts-in-thirty-days-03.7iUXyb3o.webp","/_astro/thirty-posts-in-thirty-days-06.1UdEBWS1.webp","/_astro/thirty-posts-in-thirty-days-04.B6ClaAN8.webp","/_astro/thirty-posts-in-thirty-days-05.CpMqelY5.webp","/_astro/thirty-posts-in-thirty-days-08.CXG-MYJj.webp","/_astro/thirty-posts-in-thirty-days-09.UUEOZhFR.webp","/_astro/thirty-posts-in-thirty-days-10.H-LKo6Gc.webp","/_astro/thirty-posts-now-what-01.BYLP8kFB.webp","/_astro/thirty-posts-in-thirty-days-07.DCZ3jiii.webp","/_astro/too-ugly-for-a-yimby-01.BcyKaEaY.webp","/_astro/too-ugly-for-a-yimby-02.BIg6f-Jy.webp","/_astro/thirty-posts-in-thirty-days-11.PDuH_3Mn.webp","/_astro/too-ugly-for-a-yimby-05.BmDHGjv8.webp","/_astro/too-ugly-for-a-yimby-06.B-9C-QFv.webp","/_astro/too-ugly-for-a-yimby-03.BxDj0Z8S.webp","/_astro/too-ugly-for-a-yimby-04.CpikvNsL.webp","/_astro/too-ugly-for-a-yimby-08.DoRgv9oH.webp","/_astro/too-ugly-for-a-yimby-07.Bwn4psJM.webp","/_astro/too-ugly-for-a-yimby-09.BpDyUIKb.webp","/_astro/too-ugly-for-a-yimby-10.DFe60k04.webp","/_astro/too-ugly-for-a-yimby-11.MVArDzWD.webp","/_astro/too-ugly-for-a-yimby-12.BbHJr3Es.webp","/_astro/too-ugly-for-a-yimby-13.Dts_d_WL.webp","/_astro/too-ugly-for-a-yimby-15.CEVM_W69.webp","/_astro/too-ugly-for-a-yimby-14.BNAvPhX3.webp","/_astro/trebek-s-house-01.nFwK37zZ.webp","/_astro/trebek-s-house-04.CDITRsZ5.webp","/_astro/trebek-s-house-02.DPadkgAb.webp","/_astro/trebek-s-house-03.tWHQBTac.webp","/_astro/trebek-s-house-05.du9RQ6do.webp","/_astro/trebek-s-house-06.PQJ2RZHx.webp","/_astro/trebek-s-house-08.CabNsW-e.webp","/_astro/trebek-s-house-09.BN5mBDb1.webp","/_astro/trebek-s-house-07.UingX4k5.webp","/_astro/trebek-s-house-10.COHbMH0_.webp","/_astro/trebek-s-house-12.H63vsYnc.webp","/_astro/trebek-s-house-11.DLVkWAav.webp","/_astro/trebek-s-house-13.D9pzjNE0.webp","/_astro/trebek-s-house-15.BmDCshgF.webp","/_astro/trebek-s-house-14.Ct329H_z.webp","/_astro/trebek-s-house-17.DZpuD1xP.webp","/_astro/trebek-s-house-16.3OFqiXq2.webp","/_astro/trebek-s-house-19.COD-wxey.webp","/_astro/trebek-s-house-20.DbSbq0fS.webp","/_astro/trebek-s-house-18.CBrNmeos.webp","/_astro/trebek-s-house-21.CJh3KL3C.webp","/_astro/trebek-s-house-23.BewQxE_R.webp","/_astro/trebek-s-house-22.CHbld4l0.webp","/_astro/trebek-s-house-24.BkvzgrQp.webp","/_astro/trebek-s-house-25.Dts08wRj.webp","/_astro/trebek-s-house-26.DhrKEye-.webp","/_astro/trebek-s-house-28.BGDnwr5t.webp","/_astro/tripalink-worst-thing-ever-02.4ujwSl_z.webp","/_astro/tripalink-worst-thing-ever-03.yGJaWSg0.webp","/_astro/trebek-s-house-27.oOfZ9XpG.webp","/_astro/tripalink-worst-thing-ever-01.DLUsOKwP.webp","/_astro/tripalink-worst-thing-ever-04.CoHJqPzR.webp","/_astro/tripalink-worst-thing-ever-05.DXDvzIVZ.webp","/_astro/tripalink-worst-thing-ever-06.B_VgAmsB.webp","/_astro/tripalink-worst-thing-ever-07.DFGpfZva.webp","/_astro/tripalink-worst-thing-ever-08.DtFuBXdU.webp","/_astro/tripalink-worst-thing-ever-09.3KDWRwxV.webp","/_astro/tripalink-worst-thing-ever-10.CLQERMM9.webp","/_astro/tripalink-worst-thing-ever-13.B6h1U1MO.webp","/_astro/tripalink-worst-thing-ever-11.TCeE_UVA.webp","/_astro/tripalink-worst-thing-ever-12.D_cYQNit.webp","/_astro/tripalink-worst-thing-ever-14.7065vDdx.webp","/_astro/tripalink-worst-thing-ever-15.CMjvDKRn.webp","/_astro/tripalink-worst-thing-ever-16.DstfifjR.webp","/_astro/tripalink-worst-thing-ever-17.BuTHxYCw.webp","/_astro/what-in-the-actual-hell-los-angeles-01.B-mmaS5f.webp","/_astro/what-in-the-actual-hell-los-angeles-02.DtppNKjb.webp","/_astro/what-in-the-actual-hell-los-angeles-05.C8n7OMlH.webp","/_astro/what-in-the-actual-hell-los-angeles-03.DUarFYJA.webp","/_astro/what-in-the-actual-hell-los-angeles-04.OzXyttW9.webp","/_astro/what-in-the-actual-hell-los-angeles-06.BjlfUJ-3.webp","/_astro/what-in-the-actual-hell-los-angeles-07.BYLFbGRy.webp","/_astro/what-in-the-actual-hell-los-angeles-09.5rxz0kBA.webp","/_astro/what-in-the-actual-hell-los-angeles-08.MyN27GYr.webp","/_astro/what-in-the-actual-hell-los-angeles-10.DxWfTTsK.webp","/_astro/what-in-the-actual-hell-los-angeles-11.B0yn8siQ.webp","/_astro/what-in-the-actual-hell-los-angeles-12.Bx9M73CG.webp","/_astro/what-in-the-actual-hell-los-angeles-13.DgtCz5hl.webp","/_astro/what-in-the-actual-hell-los-angeles-15.BQkBcMJn.webp","/_astro/what-in-the-actual-hell-los-angeles-14.kKBK-ATm.webp","/_astro/what-in-the-actual-hell-los-angeles-16.BKutNlM8.webp","/_astro/what-in-the-actual-hell-los-angeles-17.jLqVYuI2.webp","/_astro/what-in-the-actual-hell-los-angeles-18.BoDkSSYK.webp","/_astro/what-in-the-actual-hell-los-angeles-19.iMH50Roo.webp","/_astro/what-in-the-actual-hell-los-angeles-20.BR8hzAKx.webp","/_astro/what-in-the-actual-hell-los-angeles-22.Bg_jS3Y4.webp","/_astro/what-in-the-actual-hell-los-angeles-21.Bc5ciZw1.webp","/_astro/what-in-the-actual-hell-los-angeles-23.BEnT7bi3.webp","/_astro/what-in-the-actual-hell-los-angeles-24.CKJB2cqW.webp","/_astro/google-play.ISTMcpLO.png","/_astro/default.CZ816Hke.png","/_astro/nathan-marsak.DYhaOXEb.jpg","/_astro/e0f3fa68dc57b01ddd1fda277fe2268ac362b99a.BP4KuUxi.jpg","/_astro/nathan-marsak.BNClgTP8.webp","/_astro/hero-image.DwIC_L_T.png","/_astro/e6c23572d73fc17c258845f08dce4bf615c5a8aa.DVgjQlM8.png","/_astro/e7e0d0136e6425dc1bd12d01673caf6a1a267594.D_zeiuW2.png","/_astro/apple-touch-icon.DHIlG7dp.png","/_astro/favicon.vp_fBu0c.svg","/_astro/edge.B7O1xshw.svg","/_astro/chrome.f1eQSm4k.svg","/_astro/firefox.CMmddY9p.svg","/_astro/safari.CdqjFDzc.svg","/_astro/GlobalStyles.DgNTQexL.css","/_astro/Layout.CvoWTKp4.css","/_astro/favicon.CGiRCjPI.ico","/_astro/inter-cyrillic-ext-wght-normal.BOeWTOD4.woff2","/_astro/inter-cyrillic-wght-normal.DqGufNeO.woff2","/_astro/inter-greek-ext-wght-normal.DlzME5K_.woff2","/_astro/inter-greek-wght-normal.CkhJZR-_.woff2","/_astro/inter-vietnamese-wght-normal.CBcvBZtf.woff2","/_astro/inter-latin-ext-wght-normal.DO1Apj_S.woff2","/_astro/inter-latin-wght-normal.Dx4kXJAl.woff2","/_astro/startup.D5e3JZQ4.css","/404.html","/about/index.html","/contact/index.html","/homes/mobile-app/index.html","/homes/personal/index.html","/homes/saas/index.html","/homes/startup/index.html","/landing/click-through/index.html","/landing/lead-generation/index.html","/landing/pre-launch/index.html","/landing/product/index.html","/landing/sales/index.html","/landing/subscription/index.html","/locations/index.html","/map/index.html","/pricing/index.html","/privacy/index.html","/rss.xml","/search/index.html","/services/index.html","/terms/index.html","/index.html"],"buildFormat":"directory","checkOrigin":true,"actionBodySizeLimit":1048576,"serverIslandBodySizeLimit":1048576,"allowedDomains":[],"key":"4j1CBFZKfgbNmWDaJJ9JG/+P4c4oXwFAL0L7nPaF8CY=","image":{},"devToolbar":{"enabled":false,"debugInfoOutput":""},"logLevel":"info","shouldInjectCspMetaTags":false}));
					const manifestRoutes = _manifest.routes;
					
					const manifest = Object.assign(_manifest, {
					  renderers,
					  actions: () => import('./noop-entrypoint_BOlrdqWF.mjs'),
					  middleware: () => import('../virtual_astro_middleware.mjs'),
					  sessionDriver: () => import('./_virtual_astro_session-driver_DYx9Bb3p.mjs'),
					  
					  serverIslandMappings: () => import('./_virtual_astro_server-island-manifest_CQQ1F5PF.mjs'),
					  routes: manifestRoutes,
					  pageMap,
					});

const createApp$1 = ({ streaming } = {}) => {
  const app = new App(manifest, streaming);
  app.setFetchHandler(fetchable);
  return app;
};

const createApp = createApp$1;

function getFirstForwardedValue(multiValueHeader) {
  return multiValueHeader?.toString()?.split(",").map((e) => e.trim())?.[0];
}
const IP_RE = /^[0-9a-fA-F.:]{1,45}$/;
function isValidIpAddress(value) {
  return IP_RE.test(value);
}
function getValidatedIpFromHeader(headerValue) {
  const raw = getFirstForwardedValue(headerValue);
  if (raw && isValidIpAddress(raw)) {
    return raw;
  }
  return void 0;
}
function getClientIpAddress(request) {
  return getValidatedIpFromHeader(request.headers.get("x-forwarded-for"));
}

const app = createApp();
var entrypoint_default = {
  async fetch(request) {
    const url = new URL(request.url);
    const middlewareSecretHeader = request.headers.get(ASTRO_MIDDLEWARE_SECRET_HEADER);
    const hasValidMiddlewareSecret = middlewareSecretHeader === middlewareSecret;
    let realPath = void 0;
    if (hasValidMiddlewareSecret) {
      realPath = request.headers.get(ASTRO_PATH_HEADER);
    } else if (request.headers.get("x-vercel-isr") === "1") {
      realPath = url.searchParams.get(ASTRO_PATH_PARAM);
    }
    if (typeof realPath === "string") {
      url.pathname = realPath;
      request = new Request(url.toString(), {
        method: request.method,
        headers: request.headers,
        ...request.body ? { body: request.body, duplex: "half" } : {}
      });
    }
    const routeData = app.match(request);
    let locals = {};
    const astroLocalsHeader = request.headers.get(ASTRO_LOCALS_HEADER);
    if (astroLocalsHeader) {
      if (!hasValidMiddlewareSecret) {
        return new Response("Forbidden", { status: 403 });
      }
      locals = JSON.parse(astroLocalsHeader);
    }
    if (hasValidMiddlewareSecret) {
      request.headers.delete(ASTRO_MIDDLEWARE_SECRET_HEADER);
    }
    const response = await app.render(request, {
      routeData,
      clientAddress: getClientIpAddress(request),
      locals
    });
    if (app.setCookieHeaders) {
      for (const setCookieHeader of app.setCookieHeaders(response)) {
        response.headers.append("Set-Cookie", setCookieHeader);
      }
    }
    return response;
  }
};

export { AstroError as A, ExpectedImage as E, FailedToFetchRemoteImageDimensions as F, IncompatibleDescriptorOptions as I, LocalImageUsedWrongly as L, MissingImageDimension as M, NoImageMetadata as N, RemoteImageNotAllowed as R, UnsupportedImageFormat as U, types as a, isRemotePath as b, UnsupportedImageConversion as c, InvalidImageService as d, ExpectedImageOptions as e, ExpectedNotESMImage as f, ImageMissingAlt as g, addAttribute as h, isRemoteAllowed as i, joinPaths as j, FontFamilyNotFound as k, MissingGetFontFileRequestUrl as l, maybeRenderHead as m, renderComponent as n, InvalidComponentArgs as o, MissingSharp as p, entrypoint_default as q, renderTemplate as r, spreadAttributes as s, typeHandlers as t, unescapeHTML as u };
