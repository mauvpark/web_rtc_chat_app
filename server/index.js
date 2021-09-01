const app = require("express")();
const server = require("http").createServer(app);
const cors = require("cors");

const io = require("socket.io")(server, {
	cors: {
		origin: "*",
		methods: ["GET", "POST"],
	},
});

app.use(cors());

const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
	res.send("Server is running.");
});

io.on("connection", (socket) => {
	socket.emit("me", socket.id);

	// ? 7. Disconnect the call.
	socket.on("disconnect", () => {
		socket.broadcast.emit("callended");
	});

	socket.on("calluser", ({ userToCall, signalData, from, name }) => {
		// ? 2. Get information from socket.emit(SocketContext callUser) => emit to other user.
		io.to(userToCall).emit("calluser", { signal: signalData, from, name });
	});

	socket.on("answercall", (data) => {
		// ? 5. Send approved signal to the other who called.
		io.to(data.to).emit("callaccepted", data.signal);
	});
});

server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
