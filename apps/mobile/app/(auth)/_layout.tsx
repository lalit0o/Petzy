import { Stack } from "expo-router";
import { useAuthContext } from '@/context/AuthContext';

export default function AuthLayout(){
    const { status } = useAuthContext();
    return(
        <Stack>
            <Stack.Protected guard={status === 'signedOut'}>
                <Stack.Screen name="login" options={{headerShown:false}}/>
                <Stack.Screen name="register" options={{headerShown:false}}/>
                <Stack.Screen name="confirmation-pending" options={{headerShown:false}}/>
            </Stack.Protected>
            <Stack.Protected guard={status === 'incomplete'}>
                <Stack.Screen name="complete-profile" options={{headerShown:false}}/>
            </Stack.Protected>
            <Stack.Protected guard={status === 'inactive'}>
                <Stack.Screen name="inactive" options={{headerShown:false}}/>
            </Stack.Protected>
        </Stack>
    )
}
