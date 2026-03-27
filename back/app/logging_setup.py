import logging, sys

def setup_logging(level="INFO"):
    root = logging.getLogger()
    root.setLevel(level)

    # supprime les handlers existants (utile si le code est relancé à chaud)
    for h in list(root.handlers):
        root.removeHandler(h)

    h = logging.StreamHandler(sys.stdout)
    fmt = "%(asctime)s | %(levelname)s | %(name)s | %(message)s"
    h.setFormatter(logging.Formatter(fmt))
    root.addHandler(h)

    # Optionnel: baisse le bruit de certaines libs
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
