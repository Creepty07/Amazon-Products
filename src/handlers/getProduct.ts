import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda"
import { internalError,  notFound, ok } from "../lib/response";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { dynamo } from "../lib/dynamodb";
import { withCors } from "../common/cors";

const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE!;

export async function getProductHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
        const productId = event.pathParameters?.id;

        if(!productId){
            return notFound("El producto no fue encontrado.");
        }

        const result = await dynamo.send(
            new GetCommand({TableName: PRODUCTS_TABLE, Key: {productId}})
        )

        if(!result.Item){
            return notFound("Producto no encontrado")
        }

        return ok({ product: result.Item })
    } catch (error) {
        console.error("Error en getUser: ", error);
        return internalError()
    }
}

export const getProduct = withCors(getProductHandler)