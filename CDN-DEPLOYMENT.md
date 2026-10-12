# jsDelivr deployment

The repository's `public/` directory is the static asset root:

```text
public/
  index.svg
  hohogames.svg
  gmteb/
  kqxhh/
  assets/
    bundle-zvx8twxc.js
    index-yqXGi6ZC-08bfbe96.css
    SFCompactText-*.woff2
```

The served HOHOGAMES page loads its JavaScript, stylesheet, and favicon from:

```text
https://cdn.jsdelivr.net/gh/erlindasantos0102-spec/hohogames@main/public/
```

Select the `erlindasantos0102-spec/hohogames` repository, the `main` branch,
and the `public/` directory when locating these files in jsDelivr.

Keep the website entry point on the Node server. The app uses that same origin
for Music API requests and the existing proxy; opening `public/index.svg`
directly on jsDelivr does not provide those backend routes. Commit and push
changes to `public/` before expecting jsDelivr to serve them.
