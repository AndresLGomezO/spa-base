# Component: image

Image field (EntityFileReference) or static URL.

**Properties:** primary, fallbacks?, imageSize?, label?, styles?, conditionalStyles?

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
  "label": {
    "show": true,
    "text": "Logo",
    "position": "above"
  }
}
```
