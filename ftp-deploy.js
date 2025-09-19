import FtpDeploy from "ftp-deploy";
import path from "path";

const ftpDeploy = new FtpDeploy();

const config = {
  user: "u797290772",
  password: "Htcdesireu@1!",
  host: "ftp://145.79.209.160",
  port: 21,
  localRoot: path.join(process.cwd(), "build"),
  remoteRoot: "/public_html/",
  include: ["**/*"],
  deleteRemote: false, // set true if you want to clear old files first
  forcePasv: true
};

ftpDeploy
  .deploy(config)
  .then(res => console.log("✅ Finished uploading:", res))
  .catch(err => console.error("❌ Upload error:", err));
