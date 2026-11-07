import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda"
import { internalError, ok } from "../lib/response";
import {  QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { dynamo } from "../lib/dynamodb";

const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE!;

export async function listProductsBySeller(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
        const sellerId = event.pathParameters?.sellerId;

        if(!sellerId){
            return ok({ products: [] })
        }

        const result = await dynamo.send(
            new QueryCommand({
                TableName: PRODUCTS_TABLE,
                IndexName: "SellerIndex",
                KeyConditionExpression: "sellerId = :sellerId",
                ExpressionAttributeValues: {":sellerId": sellerId}
            })
        )


        return ok({ products: result.Items ?? []})
    } catch (error) {
        console.error("Error en getUser: ", error);
        return internalError()
    }
}