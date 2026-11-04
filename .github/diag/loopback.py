"""Clean loopback reproduction of Chrome -> Vite style sockets on port 54322.

A tiny server listens on 127.0.0.1:4174 (the Vite port). A client socket is
bound to 127.0.0.1:54322 *without* SO_REUSEADDR (like a kernel-autobound
client port) and connects to it.

estab:    keep the connection open
timewait: client closes first, so 127.0.0.1:54322 sits in TIME_WAIT; then
          everything else is closed so TIME_WAIT is the only socket left
"""
import socket
import sys
import time

mode = sys.argv[1]
srv = socket.socket()
srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
srv.bind(("127.0.0.1", 4174))
srv.listen()
cli = socket.socket()
cli.bind(("127.0.0.1", 54322))
cli.connect(("127.0.0.1", 4174))
conn, _ = srv.accept()
print("client", cli.getsockname(), "->", cli.getpeername(), flush=True)

if mode == "timewait":
    cli.close()          # active close: client side -> FIN_WAIT -> TIME_WAIT
    time.sleep(0.5)
    conn.close()
    srv.close()
    open("/tmp/hold.ready", "w").write(str(time.time()))
    sys.exit(0)

open("/tmp/hold.ready", "w").write(str(time.time()))
time.sleep(3600)
