"""CB Assets CMDB backend — Flask application factory.

Serves the same two REST dialects as the TypeScript backend:
  GLPI:       /api/public/apirest.php/...
  ServiceNow: /api/public/now/table/...

Authentication is the caller's CB Assets bearer token; PostgreSQL row level
security decides what that account may read or write, so admin accounts get
admin rights through the API exactly as they do in the web UI.
"""

from __future__ import annotations

import os

from flask import Flask, jsonify

from .classes import API_DIALECTS, CI_CLASSES
from .glpi import bp as glpi_bp, glpi_error
from .snow import bp as snow_bp


def create_app() -> Flask:
    app = Flask(__name__)
    app.config["JSON_SORT_KEYS"] = False
    app.url_map.strict_slashes = False

    app.register_blueprint(glpi_bp, url_prefix="/api/public/apirest.php")
    app.register_blueprint(snow_bp, url_prefix="/api/public/now")

    @app.get("/api/public/health")
    def health():
        return jsonify(
            {
                "status": "ok",
                "dialects": API_DIALECTS,
                "classes": [
                    {
                        "table": c.table,
                        "itemtype": c.itemtype,
                        "snow_table": c.snow_table,
                        "label": c.label,
                    }
                    for c in CI_CLASSES
                ],
            }
        )

    @app.errorhandler(404)
    def not_found(_err):
        return glpi_error("ERROR_RESOURCE_NOT_FOUND", "Unknown endpoint", 404)

    @app.errorhandler(405)
    def not_allowed(_err):
        return glpi_error("ERROR_METHOD_NOT_ALLOWED", "Method not allowed", 405)

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host=os.environ.get("HOST", "127.0.0.1"), port=int(os.environ.get("PORT", 5000)))
