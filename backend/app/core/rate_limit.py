"""Limiter central do slowapi.

Fica aqui (e não no main.py) para que os routers possam importá-lo sem import
circular. Storage em memória: com N workers do gunicorn o limite efetivo é
≈ N × a taxa configurada — ainda freia força bruta sem infra extra.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
