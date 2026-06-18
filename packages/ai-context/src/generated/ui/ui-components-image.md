# Component: image

Image field (EntityFileReference) or static URL.

**Properties:** primary, fallbacks?, imageSize?, displayMode?, objectFit?, label?, styles?, conditionalStyles?

```json
{
  "kind": "image",
  "primary": {
    "type": "field",
    "path": "logo"
  },
  "fallbacks": [
    {
      "type": "static",
      "value": "https://example.com/placeholder.png"
    }
  ],
  "imageSize": 48,
  "displayMode": "inline",
  "objectFit": "contain",
  "label": {
    "show": true,
    "text": "Logo",
    "position": "above"
  }
}
```
