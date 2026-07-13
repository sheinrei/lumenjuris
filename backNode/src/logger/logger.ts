import fs from "fs";
import path from "path";

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
}


class JsonLogger {
  private logFile: string;
  constructor(filename = "app.log.json") {
    this.logFile = path.join(process.cwd(), filename);
    // crée le fichier si inexistant
    if (!fs.existsSync(this.logFile)) {
      fs.writeFileSync(this.logFile, "", "utf-8");
    }
  }

  private write(entry: LogEntry) {
    const line = JSON.stringify(entry) + "\n";
    fs.appendFileSync(this.logFile, line, "utf-8");
  }

  private log(level: LogLevel, message: string, data?: any) {
    this.write({
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
    });
  }

  info(message: string, data?: any) {
    this.log("info", message, data);
  }

  warn(message: string, data?: any) {
    this.log("warn", message, data);
  }

  error(message: string, data?: any) {
    this.log("error", message, data);
  }

  debug(message: string, data?: any) {
    if (process.env.NODE_ENV !== "production") {
      this.log("debug", message, data);
    }
  }

  time(label: string) {
    this.log("info", `TIMER_START:${label}`);
  }

  timeEnd(label: string) {
    this.log("info", `TIMER_END:${label}`);
  }
}

export const logger = new JsonLogger();