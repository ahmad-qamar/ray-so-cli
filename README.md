# ray-so-cli
Ever wanted to create beautified code images from the command-line? This tool does just that, and supports a huge number of parameters from the native options provided at ray.so

The package utilizes the services provided by https://github.com/raycast/ray-so and automates the image creation via Puppeteer instead of having to manually use the browser each time. 

Most importantly, it has offline support when the `--local` parameter is used!

### Setup
Install the package globally via the command:
`sudo npm install -G https://github.com/ahmad-qamar/ray-so-cli.git`

To add offline support (use the `--local` paramater when using the command):
1) Clone the ray.so repository at a location of choice via `git clone https://github.com/raycast/ray-so.git`
2) Use `npm install` in its directory to install all the packages, and then `npm run build` to build the Next.JS app into production.
3) Provide the repository's path via the environment variable **`RaySoPath`**

### Examples
To create an image from a code file, use the following command in the directory:

**`raysocli -i filename.cpp -o output.png`**

To create it with offline support:

**`raysocli -i filename.cpp -o output.png --local`**

For more parameters that are supported by the package, use the command `raysocli --help`
