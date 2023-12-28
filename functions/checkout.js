const functions = Runtime.getFunctions();
const userFunction = functions.user;
const cartFunction = functions.cart;
const orderFunction = functions.order;

const { getUser, updateUser } = require(userFunction.path);
const { getCartItems } = require(cartFunction.path);
const { createOrder } = require(orderFunction.path);


exports.handler = async function (context, event, callback) {
    if (event.action === 'checkout') {
        const user = await getUser(context, event.userId);

        const orderFields = {
            UserID: event.userId,
            OrderID: event.orderId,
            ShippingAddress: event.address,
            PayerID: event.payerId,
            PayerEmailAddress: event.emailAddress,
            items: user.fields.Cart,
            PurchasedDate: new Date().toDateString(),
            Amount: event.amount,
            Status: 'Paid',
        };

        const userFields = {
            Name: event.name,
            Address: event.address,
            Cart: JSON.stringify([]),
        };

        await updateUser(context, event.userId, userFields);
        await createOrder(context, orderFields);

        const response = { success: true };
        callback(null, response);
    } else {

        const user = await getUser(context, event.userId);
        const cartItems = await getCartItems(context, user);
        const response = {
            success: cartFunction !== undefined,
            name: user.fields.Name !== undefined ? user.fields.Name : '',
            address: user.fields.Address !== undefined ? user.fields.Address : '',
            cartItems,
        };
        callback(null, response);

    }
};
